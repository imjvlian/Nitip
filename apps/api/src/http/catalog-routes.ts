import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { IntegrationNotConfiguredError } from "../config/env.js";
import { authenticateRequest } from "../lib/authenticate.js";
import { createProductUploadSignature } from "../lib/cloudinary.js";
import {
  createOutletCategory,
  deleteOutletCategory,
  listOutletCategories,
  updateOutletCategory,
} from "../repositories/categories.js";
import {
  getPublicCatalogOutlet,
  listPublicCatalogOutlets,
} from "../repositories/catalog.js";
import { getMerchantProfileByOwner } from "../repositories/merchants.js";
import { getMerchantOutlet } from "../repositories/outlets.js";
import {
  createOutletProduct,
  deleteOutletProduct,
  listOutletProducts,
  updateOutletProduct,
} from "../repositories/products.js";
import {
  parseCreateCategory,
  parseCreateProduct,
  parseUpdateCategory,
  parseUpdateProduct,
} from "./catalog-validation.js";
import { ValidationError } from "./validation.js";

function routeError(request: FastifyRequest, reply: FastifyReply, error: unknown) {
  if (error instanceof IntegrationNotConfiguredError) {
    return reply.code(503).send({
      error: "integration_not_configured",
      integration: error.integration,
    });
  }
  if (error instanceof ValidationError) {
    return reply.code(400).send({
      error: "validation_error",
      message: error.message,
    });
  }
  request.log.error({ err: error }, "Nitip catalog route failed");
  return reply.code(500).send({
    error: "internal_server_error",
    message: "Unable to complete request",
  });
}

async function getOwnedOutlet(ownerFirebaseUid: string, outletId: string) {
  const merchant = await getMerchantProfileByOwner(ownerFirebaseUid);
  if (!merchant) return null;
  const outlet = await getMerchantOutlet(merchant.id, outletId);
  if (!outlet) return null;
  return { merchant, outlet };
}

export function registerCatalogRoutes(app: FastifyInstance) {
  app.get("/catalog/outlets", async (request, reply) => {
    try {
      return { data: await listPublicCatalogOutlets() };
    } catch (error) {
      return routeError(request, reply, error);
    }
  });

  app.get<{ Params: { id: string } }>("/catalog/outlets/:id", async (request, reply) => {
    try {
      const catalog = await getPublicCatalogOutlet(request.params.id);
      if (!catalog) return reply.code(404).send({ error: "catalog_outlet_not_found" });
      return { data: catalog };
    } catch (error) {
      return routeError(request, reply, error);
    }
  });

  app.post("/merchant/media/signature", async (request, reply) => {
    const identity = await authenticateRequest(request, reply);
    if (!identity) return;
    try {
      const merchant = await getMerchantProfileByOwner(identity.uid);
      if (!merchant) return reply.code(404).send({ error: "merchant_profile_not_found" });
      return { data: createProductUploadSignature(merchant.id) };
    } catch (error) {
      return routeError(request, reply, error);
    }
  });

  app.get<{ Params: { outletId: string } }>(
    "/merchant/outlets/:outletId/categories",
    async (request, reply) => {
      const identity = await authenticateRequest(request, reply);
      if (!identity) return;
      try {
        const owned = await getOwnedOutlet(identity.uid, request.params.outletId);
        if (!owned) return reply.code(404).send({ error: "outlet_not_found" });
        return { data: await listOutletCategories(owned.outlet.id) };
      } catch (error) {
        return routeError(request, reply, error);
      }
    },
  );

  app.post<{ Params: { outletId: string } }>(
    "/merchant/outlets/:outletId/categories",
    async (request, reply) => {
      const identity = await authenticateRequest(request, reply);
      if (!identity) return;
      try {
        const owned = await getOwnedOutlet(identity.uid, request.params.outletId);
        if (!owned) return reply.code(404).send({ error: "outlet_not_found" });
        const category = await createOutletCategory(owned.outlet.id, parseCreateCategory(request.body));
        return reply.code(201).send({ data: category });
      } catch (error) {
        return routeError(request, reply, error);
      }
    },
  );

  app.patch<{ Params: { outletId: string; id: string } }>(
    "/merchant/outlets/:outletId/categories/:id",
    async (request, reply) => {
      const identity = await authenticateRequest(request, reply);
      if (!identity) return;
      try {
        const owned = await getOwnedOutlet(identity.uid, request.params.outletId);
        if (!owned) return reply.code(404).send({ error: "outlet_not_found" });
        const category = await updateOutletCategory(
          owned.outlet.id,
          request.params.id,
          parseUpdateCategory(request.body),
        );
        if (!category) return reply.code(404).send({ error: "category_not_found" });
        return { data: category };
      } catch (error) {
        return routeError(request, reply, error);
      }
    },
  );

  app.delete<{ Params: { outletId: string; id: string } }>(
    "/merchant/outlets/:outletId/categories/:id",
    async (request, reply) => {
      const identity = await authenticateRequest(request, reply);
      if (!identity) return;
      try {
        const owned = await getOwnedOutlet(identity.uid, request.params.outletId);
        if (!owned) return reply.code(404).send({ error: "outlet_not_found" });
        const result = await deleteOutletCategory(owned.outlet.id, request.params.id);
        if (result === "not_found") return reply.code(404).send({ error: "category_not_found" });
        if (result === "not_empty") {
          return reply.code(409).send({
            error: "category_not_empty",
            message: "Hapus atau pindahkan produk di kategori ini terlebih dahulu",
          });
        }
        return { ok: true };
      } catch (error) {
        return routeError(request, reply, error);
      }
    },
  );

  app.get<{ Params: { outletId: string } }>(
    "/merchant/outlets/:outletId/products",
    async (request, reply) => {
      const identity = await authenticateRequest(request, reply);
      if (!identity) return;
      try {
        const owned = await getOwnedOutlet(identity.uid, request.params.outletId);
        if (!owned) return reply.code(404).send({ error: "outlet_not_found" });
        return { data: await listOutletProducts(owned.outlet.id) };
      } catch (error) {
        return routeError(request, reply, error);
      }
    },
  );

  app.post<{ Params: { outletId: string } }>(
    "/merchant/outlets/:outletId/products",
    async (request, reply) => {
      const identity = await authenticateRequest(request, reply);
      if (!identity) return;
      try {
        const owned = await getOwnedOutlet(identity.uid, request.params.outletId);
        if (!owned) return reply.code(404).send({ error: "outlet_not_found" });
        const product = await createOutletProduct(owned.outlet.id, parseCreateProduct(request.body));
        if (!product) {
          return reply.code(400).send({
            error: "invalid_category",
            message: "Kategori tidak ditemukan pada outlet ini",
          });
        }
        return reply.code(201).send({ data: product });
      } catch (error) {
        return routeError(request, reply, error);
      }
    },
  );

  app.patch<{ Params: { outletId: string; id: string } }>(
    "/merchant/outlets/:outletId/products/:id",
    async (request, reply) => {
      const identity = await authenticateRequest(request, reply);
      if (!identity) return;
      try {
        const owned = await getOwnedOutlet(identity.uid, request.params.outletId);
        if (!owned) return reply.code(404).send({ error: "outlet_not_found" });
        const product = await updateOutletProduct(
          owned.outlet.id,
          request.params.id,
          parseUpdateProduct(request.body),
        );
        if (!product) return reply.code(404).send({ error: "product_or_category_not_found" });
        return { data: product };
      } catch (error) {
        return routeError(request, reply, error);
      }
    },
  );

  app.delete<{ Params: { outletId: string; id: string } }>(
    "/merchant/outlets/:outletId/products/:id",
    async (request, reply) => {
      const identity = await authenticateRequest(request, reply);
      if (!identity) return;
      try {
        const owned = await getOwnedOutlet(identity.uid, request.params.outletId);
        if (!owned) return reply.code(404).send({ error: "outlet_not_found" });
        const deleted = await deleteOutletProduct(owned.outlet.id, request.params.id);
        if (!deleted) return reply.code(404).send({ error: "product_not_found" });
        return { ok: true };
      } catch (error) {
        return routeError(request, reply, error);
      }
    },
  );
}

const express = require("express");
const orderController = require("../controllers/order");
const router = express.Router();

router.post("/shipping", orderController.calculateShipping);

router.post("/order", orderController.createOrder);

router.get("/order", orderController.getAllOrders);

router.get("/order/:id", orderController.getOne);

router.patch("/order/:id", orderController.updateOrder);

router.patch("/start-order/:id", orderController.assignDelivery);

router.get("/user-orders", orderController.getUserOrders);

router.delete("/order/:id", orderController.deleteOrder);

module.exports = router;
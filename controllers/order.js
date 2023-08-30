const Area = require("../models/area");
const Cart = require("../models/cart");
const CartProduct = require("../models/cartProduct");
const Product = require("../models/product");
const Order = require("../models/order");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const Vendor = require("../models/vendor");
const Option = require("../models/option");
const { io } = require("../app");
const VendorOrder = require("../models/vendorOrders");

let deliveryId = null;

io.on("connection", (socket) => {
  socket.on("delivery-id", (message) => {
    console.log(message);
    deliveryId = message;
  });
});

exports.createOrder = async (req, res) => {
  const { areaId, address, name, phone, location, notes } = req.body;

  try {
    let vendors = [];

    let shippingDirections = [];

    let shipping = 0;

    const token = req.headers.authorization.split(" ")[1]; // get token from Authorization header

    const decodedToken = jwt.verify(token, "talabatek2309288/k_ss-jdls88");

    const cart = await Cart.findOne({
      where: { userId: decodedToken.userId },
      include: [
        {
          model: CartProduct,
          include: [
            {
              model: Product,
              include: {
                model: User,
                attributes: ["id"],
                include: [{ model: Area }, Vendor],
              },
            },
          ],
          where: { ordered: false },
        },
      ],
    });

    if (!cart) {
      return res.status(400).json({ message: "no items in cart" });
    }

    // calculate shipping cost
    cart.cart_products.forEach(async (e) => {
      const area = e.product.user.areas.find((item) => item.id === +areaId);

      const directionIndex = shippingDirections.findIndex(
        (item) => item.direction === e.product.user.vendor.direction
      );

      if (directionIndex >= 0) {
        const direction = shippingDirections[directionIndex];

        if (direction.cost < +area.delivery_cost.cost) {
          shippingDirections[directionIndex] = {
            vendor: +e.product.user.vendor.id,
            cost: +area.delivery_cost.cost,
            direction: e.product.user.vendor.direction,
          };
        }
      } else {
        shippingDirections.push({
          vendor: +e.product.user.vendor.id,
          cost: +area.delivery_cost.cost,
          direction: e.product.user.vendor.direction,
        });
      }

      await Product.update(
        { orders: +e.product.orders + +e.quantity },
        { where: { id: e.product.id } }
      );

      const vendorIndex = vendors.findIndex(
        (item) => +item.vendorId === +e.product.user.vendor.id
      );

      if (vendorIndex < 0) {
        vendors.push({ vendorId: +e.product.user.vendor.id });
      }
    });

    shippingDirections.forEach((e) => {
      shipping = shipping + e.cost;
    });

    //save order
    const order = await Order.create({
      address,
      total_quantity: cart.total_quantity,
      subtotal: +cart.total,
      shipping,
      name,
      phone,
      location,
      notes,
      total: shipping + +cart.total,
      userId: decodedToken.userId,
    });

    //save vendor orders
    await VendorOrder.bulkCreate(
      vendors.map((item) => {
        return {
          vendorId: item.vendorId,
          orderId: order.id,
        };
      })
    );

    //assign order id to cart product
    await CartProduct.update(
      {
        ordered: true,
        orderId: order.id,
      },
      { where: { ordered: false, cartId: cart.id } }
    );

    cart.total_quantity = 0;

    cart.total = 0;

    await cart.save();

    return res.status(200).json({ message: "success", order });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "internal server error" });
  }
};

exports.calculateShipping = async (req, res) => {
  const { areaId } = req.body;

  try {
    let shippingDirections = [];

    let shipping = 0;

    let time = 0;

    let distance = 0;

    const token = req.headers.authorization.split(" ")[1]; // get token from Authorization header

    const decodedToken = jwt.verify(token, "talabatek2309288/k_ss-jdls88");

    const cart = await Cart.findOne({
      where: { userId: decodedToken.userId },
      include: [
        {
          model: CartProduct,
          include: [
            {
              model: Product,
              include: {
                model: User,
                attributes: ["id"],
                include: [{ model: Area }, Vendor],
              },
            },
          ],
          where: { ordered: false },
        },
      ],
    });

    if (cart?.cart_products) {
      cart.cart_products.forEach((e) => {
        const area = e.product.user.areas.find((item) => item.id === +areaId);

        const directionIndex = shippingDirections.findIndex(
          (item) => item.direction === e.product.user.vendor.direction
        );

        if (directionIndex >= 0) {
          const direction = shippingDirections[directionIndex];

          if (direction.cost < +area.delivery_cost.cost) {
            shippingDirections[directionIndex] = {
              vendor: +e.product.user.vendor.id,
              cost: +area.delivery_cost.cost,
              direction: e.product.user.vendor.direction,
              distance: +e.product.user.vendor.distance,
              time: +e.product.user.vendor.delivery_time,
            };
          }
        } else {
          shippingDirections.push({
            vendor: +e.product.user.vendor.id,
            cost: +area.delivery_cost.cost,
            direction: e.product.user.vendor.direction,
            time: +e.product.user.vendor.delivery_time,
            distance: +e.product.user.vendor.distance,
          });
        }
      });
    }

    shippingDirections.forEach((e) => {
      shipping = shipping + e.cost;
      time = time + e.time;
      distance = distance + e.distance;
    });

    return res.status(200).json({
      message: "success",
      shipping,
      subtotal: +cart.total,
      total: +cart.total + shipping,
      time: time,
      distance: distance,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "internal server error" });
  }
};

exports.getAllOrders = async (req, res) => {
  const { size, page, status, deliveryId } = req.query;
  try {
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    let orders = null;

    let filters = {};

    if (deliveryId) {
      filters.deliveryId = deliveryId;
    }

    if (status) {
      filters.status = status;
    }

    if (page) {
      orders = await Order.findAll({
        limit: limit,
        offset: offset,
        include: [
          { model: User, attributes: ["id", "name", "phone", "address"] },
          {
            model: CartProduct,
            required: false,
            include: [
              {
                model: Product,
                include: [
                  {
                    model: User,
                    attributes: ["id", "name", "email", "phone", "address"],
                    include: {
                      model: Vendor,
                      attributes: ["id", "direction", "distance"],
                    },
                  },
                ],
              },
              Option,
            ],
            where: { ordered: true },
          },
        ],
        where: filters,
        order: [["createdAt", "DESC"]],
      });
    } else {
      orders = await Order.findAll({
        include: [
          { model: User, attributes: ["id", "name", "phone", "address"] },
          {
            model: CartProduct,
            required: false,
            include: [
              {
                model: Product,
                include: [
                  {
                    model: User,
                    attributes: ["id", "name", "email", "phone", "address"],
                    include: {
                      model: Vendor,
                      attributes: ["id", "direction", "distance"],
                    },
                  },
                ],
              },
              Option,
            ],
            where: { ordered: true },
          },
        ],
        where: filters,
        order: [["createdAt", "DESC"]],
      });
    }

    const count = await Order.count(); // Get total number of products
    const numOfPages = Math.ceil(count / limit); // Calculate number of pages

    return res.status(200).json({ count, pages: numOfPages, results: orders });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "internal server error" });
  }
};

exports.updateOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await Order.update(req.body, { where: { id } });

    if (req.body.status) {
      await VendorOrder.update(
        { status: req.body.status },
        { where: { orderId: id } }
      );
    }

    return res.status(200).json({ message: "success", order });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "internal server error" });
  }
};

exports.assignDelivery = async (req, res) => {
  const { id } = req.params;
  try {
    const token = req.headers.authorization.split(" ")[1]; // get token from Authorization header

    const decodedToken = jwt.verify(token, "talabatek2309288/k_ss-jdls88");

    const order = await Order.update(
      { status: "started", deliveryId: decodedToken.userId },
      { where: { id } }
    );

    const orders = await Order.findAll({
      include: [
        { model: User, attributes: ["id", "name", "phone", "address"] },
        {
          model: CartProduct,
          required: false,
          include: [
            {
              model: Product,
              include: [
                {
                  model: User,
                  attributes: ["id", "name", "email", "phone", "address"],
                  include: {
                    model: Vendor,
                    attributes: ["id", "direction", "distance"],
                  },
                },
              ],
            },
            Option,
          ],
          where: { ordered: true },
        },
      ],
      where: { status: "not started" },
      order: [["createdAt", "DESC"]],
    });

    io.emit("pending-orders", { results: orders });

    if (deliveryId) {
      const deliveryOrders = await Order.findAll({
        include: [
          { model: User, attributes: ["id", "name", "phone", "address"] },
          {
            model: CartProduct,
            required: false,
            include: [
              {
                model: Product,
                include: [
                  {
                    model: User,
                    attributes: ["id", "name", "email", "phone", "address"],
                    include: {
                      model: Vendor,
                      attributes: ["id", "direction", "distance"],
                    },
                  },
                ],
              },
              Option,
            ],
            where: { ordered: true },
          },
        ],
        where: { deliveryId },
        order: [["createdAt", "DESC"]],
      });

      io.emit("delivery-orders", { results: deliveryOrders });
    }

    return res.status(200).json({ message: "success", order });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "internal server error" });
  }
};

exports.getVendorOrder = async (req, res) => {
  const { size, page, status, vendorId } = req.query;

  try {
    const vendor = await Vendor.findOne({ where: { userId: vendorId } });

    const limit = parseInt(size);

    const offset = (parseInt(page) - 1) * limit;

    let orders = null;

    let filters = {};

    if (status) {
      filters.status = status;
    }

    if (page) {
      orders = await Order.findAll({
        limit: limit,
        offset: offset,
        attributes: [
          "id",
          "status",
          "name",
          "phone",
          "total",
          "createdAt",
          "notes",
        ],
        include: [
          {
            model: CartProduct,
            required: true,
            include: [
              {
                model: Product,
              },
              Option,
            ],
            where: { ordered: true, vendorId },
          },
        ],
        where: filters,
        order: [["createdAt", "DESC"]],
      });
    } else {
      orders = await Order.findAll({
        attributes: [
          "id",
          "status",
          "name",
          "phone",
          "total",
          "createdAt",
          "notes",
        ],
        include: [
          {
            model: CartProduct,
            required: true,
            include: [
              {
                model: Product,
              },
              Option,
            ],
            where: { ordered: true, vendorId },
          },
        ],
        where: filters,
        order: [["createdAt", "DESC"]],
      });
    }

    orders = orders.map((order) => {
      let total = 0;
      order.cart_products.forEach((e) => {
        total = total + +e.total;
      });
      return { ...order.toJSON(), total: total };
    });

    const count = await VendorOrder.count({ where: { vendorId: vendor.id } }); // Get total number of products

    const numOfPages = Math.ceil(count / limit); // Calculate number of pages

    return res.status(200).json({ count, pages: numOfPages, results: orders });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "internal server error" });
  }
};

exports.getOne = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await Order.findByPk(id, {
      include: [
        { model: User, attributes: ["id", "name", "phone", "address"] },
        {
          model: CartProduct,
          include: [
            {
              model: Product,
              include: [
                {
                  model: User,
                  attributes: ["id", "name", "email", "phone", "address"],
                  include: {
                    model: Vendor,
                    attributes: ["id", "direction", "distance"],
                  },
                },
              ],
            },
            Option,
          ],
          where: { ordered: true },
        },
      ],
    });

    return res.status(200).json({ message: "success", order });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "internal server error" });
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1]; // get token from Authorization header

    const decodedToken = jwt.verify(token, "talabatek2309288/k_ss-jdls88");

    const orders = await Order.findAll({
      include: [
        {
          model: CartProduct,
          include: [
            {
              model: Product,
              include: [
                {
                  model: User,
                  attributes: ["id", "name", "email", "phone", "address"],
                  include: {
                    model: Vendor,
                    attributes: ["id", "direction", "distance"],
                  },
                },
              ],
            },
            Option,
          ],
          where: { ordered: true },
        },
      ],
      where: { userId: decodedToken.userId },
    });

    return res.status(200).json({ message: "success", results: orders });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "internal server error" });
  }
};

exports.deleteOrder = async (req, res) => {
  const { id } = req.params;

  Order.destroy({ where: { id } })
    .then(() => res.json({ message: "order deleted" }))
    .catch((error) => res.status(400).json({ error }));
};

const express = require("express");

const multer = require("multer");

const bodyParser = require("body-parser");

const sequelize = require("./util/database");

const cors = require("cors");

//---------models---------------------------------
const User = require("./models/user");
const Admin = require("./models/admin");
const AdminRole = require("./models/adminRole");
const Delivery = require("./models/delivery");
const Vendor = require("./models/vendor");
const Category = require("./models/category");
const Slider = require("./models/slider");
const Product = require("./models/product");
const ProductImage = require("./models/productImage");
const UserFavoriteProduct = require("./models/UserFavoriteproduct");
const UserFavoriteVendor = require("./models/userFavoriteVendors");
const VendorCategory = require("./models/vendorCategories");
const Area = require("./models/area");
const DeliveryCost = require("./models/delivery_cost");
const OptionGroup = require("./models/optionGroup");
const Option = require("./models/option");
const Cart = require("./models/cart");
const CartProduct = require("./models/cartProduct");
const CartProductOption = require("./models/cartProductOption");
//--------routes------------------------------
const userRoutes = require("./routes/user");
const adminRoutes = require("./routes/admin");
const deliveryRoutes = require("./routes/delivery");
const vendorRoutes = require("./routes/vendor");
const Notification = require("./models/notifications");
const UserNotification = require("./models/userNotification");
const notificationsRouts = require("./routes//notification");
const categoryRoutes = require("./routes/category");
const sliderRoutes = require("./routes/slider");
const productRoutes = require("./routes/product");
const favoriteRoutes = require("./routes/favorite");
const areaRoutes = require("./routes/area");
const deliverCostRoutes = require("./routes/deliverCosts");
const optionGroupRoutes = require("./routes/optionsGroup");
const cartRoutes = require("./routes/cart");
//--------relations---------------------------

//assign admin to user profile
User.hasOne(Admin);
Admin.belongsTo(User);

//assign admin to user profile
User.hasOne(Delivery);
Delivery.belongsTo(User);

//assign Cart  to user profile
User.hasOne(Cart);
Cart.belongsTo(User);

//assign cart product to user cart
Cart.hasMany(CartProduct);
CartProduct.belongsTo(Cart);

Product.hasMany(CartProduct);
CartProduct.belongsTo(Product);

// define associations between cartProduct and Option
CartProduct.belongsToMany(Option, { through: CartProductOption });
Option.belongsToMany(CartProduct, { through: CartProductOption });

//assign roles to admin profile
Admin.hasOne(AdminRole);
AdminRole.belongsTo(Admin);

User.hasOne(Vendor);
Vendor.belongsTo(User);

Product.hasMany(Slider);
Slider.belongsTo(Product);

Product.hasMany(ProductImage);
ProductImage.belongsTo(Product);

Product.hasMany(UserFavoriteProduct);
UserFavoriteProduct.belongsTo(Product);

User.hasMany(UserFavoriteVendor, {
  foreignKey: "vendorId",
});
UserFavoriteVendor.belongsTo(User, {
  foreignKey: "vendorId",
});

User.hasMany(Product, {
  foreignKey: "vendorId",
});
Product.belongsTo(User, {
  foreignKey: "vendorId",
});

Category.hasMany(Product);
Product.belongsTo(Category);

User.hasMany(Slider, {
  foreignKey: "vendorId",
});
Slider.belongsTo(User, {
  foreignKey: "vendorId",
});

// define associations between the models
User.belongsToMany(Notification, { through: UserNotification });
Notification.belongsToMany(User, { through: UserNotification });

// define associations between vendor and category
User.belongsToMany(Category, { through: VendorCategory });
Category.belongsToMany(User, { through: VendorCategory });

// define associations between vendor and area
User.belongsToMany(Area, { through: DeliveryCost });
Area.belongsToMany(User, { through: DeliveryCost });

Product.hasMany(OptionGroup);
OptionGroup.belongsTo(Product);

OptionGroup.hasMany(Option);
Option.belongsTo(OptionGroup);
//-------settings-----------------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

const app = express();

// app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(
  upload.fields([
    { name: "image", maxCount: 3 },
    { name: "cover", maxCount: 1 },
  ])
);

app.use("/uploads", express.static("uploads"));

app.options("*", cors()); // include before other routes

app.use(cors());

//routes=====================
app.use("/user", userRoutes);

app.use("/admin", adminRoutes);

app.use("/delivery", deliveryRoutes);

app.use("/vendor", vendorRoutes);

app.use("/api", notificationsRouts);

app.use("/api", categoryRoutes);

app.use("/api", sliderRoutes);

app.use("/api", productRoutes);

app.use("/api", favoriteRoutes);

app.use("/api", areaRoutes);

app.use("/api", deliverCostRoutes);

app.use("/api", optionGroupRoutes);

app.use("/api", cartRoutes);

sequelize
  .sync()
  .then((result) => {
    app.listen(3000);
  })
  .catch((err) => {
    console.log(err);
  });

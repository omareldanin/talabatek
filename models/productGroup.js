const Sequelize = require("sequelize");

const sequelize = require("../util/database");

const ProductGroup = sequelize.define("product_group", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
});

module.exports = ProductGroup;
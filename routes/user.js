const express = require("express");
const userController = require("../controllers/user");
const validateUser = require("../middlewares/validateUser");
const router = express.Router();

router.post("/signup", validateUser, userController.register);

router.post("/login", userController.login);

router.get("/profile", userController.getUserByToken);

router.post("/reset-password", userController.resetPassword);

router.patch("/update", userController.updateProfile);

router.delete("/delete/:id", userController.deleteUser);

module.exports = router;

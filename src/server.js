//IMPORTS
const express = require("express");
const cors = require("cors");
const listEndpoints = require("express-list-endpoints");
const productsRoutes = require("./services/products");
const cartsRoutes = require("./services/carts");

const path = require("path");
const {
  notFoundHandler,
  unauthorizedHandler,
  forbiddenHandler,
  catchAllHandler,
} = require("./errorHandling");

const server = express();
const port = process.env.PORT || 3001;



//MIDDLEWARES

server.use(cors());
server.use(express.json());
server.use(express.static(path.join(__dirname, '../public/img')))

//ROUTES
server.use("/products", productsRoutes);
server.use("/carts", cartsRoutes)
// server.use("/reviews", reviewsRoutes);
// server.use("/problems", problematicRoutes)

// ERROR HANDLERS

server.use(notFoundHandler);
server.use(unauthorizedHandler);
server.use(forbiddenHandler);
server.use(catchAllHandler);

// console.log(listEndpoints(server))

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

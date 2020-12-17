const express = require("express");
const path = require("path");
const uniqid = require("uniqid");
const router = express.Router();
const multer = require("multer");
const upload = multer({});
const {
  readDB,
  writeDB,
  getProducts,
  writeProducts,
} = require("../../lib/utilities");

const { writeFile, createReadStream } = require("fs-extra");
const {pipeline} = require("stream")
const { Transform } = require("json2csv")

const productPath = path.join(__dirname, "products.json")

const { check, validationResult } = require("express-validator");
const productValidation = [
  check("name")
    .isLength({ min: 4 })
    .withMessage("short name")
    .exists()
    .withMessage("Insert a name please!"),
];

const reviewValidation = [
  check("rate").exists().withMessage("Rate is required"),
  check("comment").exists().withMessage("comment is required"),
];


router.get("/exportToCSV", async (req, res, next) => {
try {
let readableStream = createReadStream(productPath)
let json2csv = new Transform({fields: [
  "_id",
  "name",
  "description",
  "brand",
  "price",
  "category",
  "createdAt",
  "updatedAt",
  "imageUrl"
]})
res.setHeader("Content-Disposition", "attachment; filename=productsList.csv")
pipeline(readableStream, json2csv, res, err=>{
  if (err) {
    console.log(err);
    next(err)
  } else {
console.log("Done");


  }
} )
} catch (error) {
  console.log(error);
  
}

})

router.get("/:productId", async (req, res, next) => {
  try {
    const products = await getProducts();
    const productFound = products.find(
      product => product._id === req.params.productId
    );
    if (productFound) {
      res.send(productFound);
    } else {
      const err = new Error();
      err.httpStatusCode = 404;
      next(err);
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const products = await getProducts();
    if (req.query && req.query.category) {
      const filteredProducts = products.filter(
        product =>
          product.hasOwnProperty("category") &&
          product.category === req.query.category
      );
      res.send(filteredProducts);
    } else {
      res.setDefaultEncoding(products);
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});



router.post("/", productValidation, async (req, res, next) => {
  try {
    const validationErrors = validationResult(req);
    const products = await getProducts();
const productFound = products.find(product => product._id = req.body._id)
    if (!validationErrors.isEmpty() && productFound) {
      const err = new Error();
      err.httpStatusCode = 400;
      err.message = validationErrors;
      next(err);
    } else {
      const products = await getProducts();
      products.push({
        ...req.body,
        _id: uniqid(),
        createdAt: new Date(),
        updatedAt: new Date(),
        reviews: [],
      });
      await writeProducts();
      res.status(201).send("ok");
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.delete("/:productId", async (req, res, next) => {
  try {
    const products = await getProducts();
    const productFound = products.find(
      product => product._id === req.params.productId
    );
    if (productFound) {
      const filteredProducts = products.filter(
        product => product._id != productFound
      );
      await writeProducts(filteredProducts);
      res.status(201).send("ok");
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.put("/:productId", productValidation, async (req, res, next) => {
  try {

    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {
      const err = new Error();
      err.httpStatusCode = 400;
      err.message = validationErrors;
      next(err);
    } else {
      const products = await getProducts();
      const productsIndex = products.findIndex(
        product => product._id === req.params.productId
      );

      if (productsIndex !== -1) {
        const updatedProducts = [
          ...products.slice(0, productsIndex),
          { ...products[productsIndex], ...req.body },
          ...products.slice(productsIndex + 1),
        ];
        await writeProducts(updatedProducts);
        res.send(updatedProducts);
      } else {
        const err = new Error();
        err.httpStatusCode = 404;
        next(error);
      }
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.get("/:id/reviews", async (req, res, next) => {
  try {
    const products = await getProducts();
    const productFound = products.find(
      product => product._id === req.params.id
    );
    if (productFound) {
      res.send(productFound.reviews);
    } else {
      const error = new Error();
      error.httpStatusCode = 404;
      next(error);
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.get("/:id/reviews/:reviewId", async (req, res, next) => {
  try {
    const products = await getProducts();
    const productFound = products.find(
      product => product._id === req.params.id
    );
    if (productFound) {
      const reviewFound = productFound.reviews.find(
        review => review._id === review.params.reviewId
      );
      if (reviewFound) {
        res.status(201).send(reviewFound);
      } else {
        const error = new Error();
        error.httpStatusCode = 404;
        next(error);
      }
    } else {
      const err = new Error();
      err.httpStatusCode = 404;
      next(err);
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.post("/:id/reviews/", reviewValidation, async (req, res, next) => {
  try {
    const products = await getProducts();

    const productIndex = products.findIndex(
      product => product._id === req.params.id
    );
    if (productIndex !== -1) {
      // product found
      products[productIndex].reviews.push({
        ...req.body,
        _id: uniqid(),
        createdAt: new Date(),
      });
      await writeProducts(products);
      res.status(201).send(products);
    } else {
      // product not found
      const error = new Error();
      error.httpStatusCode = 404;
      next(error);
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.put(
  "/:id/reviews/:reviewId",
  reviewValidation,
  async (req, res, next) => {
    try {
      const products = await getProducts();

      const productIndex = products.findIndex(
        product => product._id === req.params.id
      );

      if (productIndex !== -1) {
        const reviewIndex = products[productIndex].reviews.findIndex(
          review => review._id === req.params.reviewId
        );

        if (reviewIndex !== -1) {
          const previousReview = products[productIndex].reviews[reviewIndex];

          const updateReviews = [
            ...products[productIndex].reviews.slice(0, reviewIndex),
            { ...previousReview, ...req.body, updatedAt: new Date() },
            ...products[productIndex].reviews.slice(reviewIndex + 1),
          ];
          products[productIndex].reviews = updateReviews;

          await writeProducts(products);
          res.send(products);
        } else {
          console.log("Review not found");
        }
      } else {
        console.log("Product not found");
      }
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
);

router.delete("/:id/reviews/:reviewId", async (req, res, next) => {
  try {
    const products = await getProducts();
    const productIndex = products.findIndex(
      product => product._id === req.params.id
    );
    if (productIndex !== -1) {
      products[productIndex].reviews = products[productIndex].reviews.filter(
        review => review._id !== req.params.reviewId
      );
      await writeProducts(products);
      res.send(products);
    } else {
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const products = await getProducts();
    const filteredProducts = products.filter(product => product._id != req.params.id);
    await writeProducts(filteredProducts);
    res.send("Product has been deleted");
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router
  .post("/:id/upload", upload.single("image"), async (req, res, next) => {
    const [name, extention] = req.file.mimetype.split("/");
    try {
      await writeFile(
        path.join(
          __dirname,
          `../../../public/img/products/${req.params.id}.${extention}`
        ),
        req.file.buffer
      );
      const products = await getProducts();
      const updatedDb = products.map(product =>
        product._id === req.params.id
          ? {
              ...product,
              updatedAt: new Date(),
              imageUrl: `http://localhost:${process.env.PORT}/products/${req.params.id}.${extention}`,
            }
          : product
      );
      await writeProducts(updatedDb);
      // console.log(updatedDb)
      res.status(201).send("ok");
    } catch (error) {
      console.log(error);
      next(error);
    }
  });




module.exports = router;

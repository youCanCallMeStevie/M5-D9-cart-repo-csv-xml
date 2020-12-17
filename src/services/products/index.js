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
const { pipeline } = require("stream");
const { Transform } = require("json2csv");

const { parseString } = require("xml2js");
const publicIp = require("public-ip");
const axios = require("axios"); //library to create http request (similar to browser's fetch). Can be used in FE & BE
const { promisify } = require("util");
const { begin } = require("xmlbuilder"); //plug in to build xtml document

const xmlRoutes = express.Router();
const asyncParser = promisify(parseString);

const productPath = path.join(__dirname, "products.json");

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
    const productFound = products.find(product => (product._id = req.body._id));
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
    const filteredProducts = products.filter(
      product => product._id != req.params.id
    );
    await writeProducts(filteredProducts);
    res.send("Product has been deleted");
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.post("/:id/upload", upload.single("image"), async (req, res, next) => {
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

router.get("/export/exportToCSV", async (req, res, next) => {
  try {
    let readableStream = createReadStream(productPath);
    let json2csv = new Transform({
      fields: [
        "_id",
        "name",
        "description",
        "brand",
        "price",
        "category",
        "createdAt",
        "updatedAt",
        "imageUrl",
      ],
    });
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=productsList.csv"
    );
    pipeline(readableStream, json2csv, res, err => {
      if (err) {
        console.log(err);
        next(err);
      } else {
        console.log("Done");
      }
    });
  } catch (error) {
    console.log(error);
  }
});

router.get("/sumTwoPrices", async (req, res, next) => {
  try {
    const { twoProds } = req.query;

    const xmlBody = 
    
//     `<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
//   <soap12:Body>
//     <Add xmlns="http://tempuri.org/">
//       <intA>${twoProds[0].price}</intA>
//       <intB>${twoProds[1].price}</intB>
//     </Add>
//   </soap12:Body>
// </soap12:Envelope>`;

begin()
      .ele("soap12:Envelope", {
        "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
      })
      .ele("soap12:Body")
      .ele("Add", {
        xmlns: "http://tempuri.org/",
      })
      .ele("intA")
      .text(parseInt(`${twoProds[0].price}`))
      .up() // because it is a sibling & not a nested item
      .ele("intB")
      .text(parseInt(`${twoProds[1].price}`))
      .end()

    const response = await axios({ // create a http request {POST on on the url, and you need HEADERS!! & provide the xml body by respecting the documentation and their specs (we did this above) }
      method: "post",
      url:
        "http://www.dneonline.com/calculator.asmx?op=Add",
      data: xmlBody,
      headers: { "Content-type": "text/xml" },
    });
    const xml = response.data;
    const parsedJS = await asyncParser(xml);
    res.send(
      parsedJS["soap12:Envelope"]["soap12:Body"][0][
        "m:AllLowercaseWithTokenResponse"
      ][0]["m:AllLowercaseWithTokenResult"][0]
    );
  } catch (error) {
    next(error);
  }
});

module.exports = router;

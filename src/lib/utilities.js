const { writeJSON, readJSON } = require("fs-extra")
const {join} = require("path")
const productsPath = join(__dirname,"../services/products/products.json")

const readDB = async filePath => {
  try {
    const fileJSON = await readJSON(filePath)
    console.log(fileJSON)
    return fileJSON
  } catch (error) {
   console.log(error)
  }
}

const writeDB = async (filePath, data) => {
  //writing on disk
  try {
    console.log(filePath)
    await writeJSON(filePath, data)
  } catch (error) {
   console.log(error)
  }
}

module.exports = {
  readDB,
  writeDB,
  getProducts: async () => readDB(productsPath),
  writeProducts: async (productsData) => writeDB(productsPath, productsData),
  // getUsers
  // getBooks

}
const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();
/* 
car-menufactur
Mdxp6N2KgwKAU1bG

*/
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4j1ot.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
const run = async () => {
  try {
    await client.connect();
    const toolsCollection = client
      .db("mobile-menufacturer")
      .collection("tools");
    const reviewsCollection = client
      .db("mobile-menufacturer")
      .collection("reviews");

    app.get("/hometools", async (req, res) => {
      const query = {};
      const cursor = toolsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/homereviews", async (req, res) => {
      const query = {};
      const cursor = reviewsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
  } finally {
    // await client.close();
  }
};
run().catch(console.dir);
// middlewares
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Mobile port is running");
});
app.listen(port, () => {
  console.log("Mobile port running with 5000 port");
});

const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const jwt = require("jsonwebtoken");
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.auth;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.token, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "forbidded access" });
    }
    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4j1ot.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
const run = async () => {
  try {
    await client.connect();

    // db connection
    const toolsCollection = client
      .db("mobile-menufacturer")
      .collection("tools");
    const reviewsCollection = client
      .db("mobile-menufacturer")
      .collection("reviews");
    const userCollection = client.db("mobile-menufacturer").collection("users");

    // authentication
    app.put("/login", async (req, res) => {
      const email = req.body;

      const accessToken = jwt.sign({ email }, process.env.token, {
        expiresIn: "2d",
      });

      const options = { upsert: true };
      const updateDoc = {
        $set: email,
      };
      console.log(updateDoc);
      const filter = { email };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      console.log({ result, accessToken });
      res.send({ result, accessToken });
    });

    // Home Tools data
    app.get("/hometools", async (req, res) => {
      const query = {};
      const cursor = toolsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // home reviews get
    app.get("/homereviews", async (req, res) => {
      const query = {};
      const cursor = reviewsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/purchase/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      console.log(query);
      const tool = await toolsCollection.findOne(query);
      res.send({ tool });
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

const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const jwt = require("jsonwebtoken");
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();
const stripe = require("stripe")(process.env.stripe_token);

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
    req.decoded = decoded.email;
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
    const ordersCollection = client
      .db("mobile-menufacturer")
      .collection("orders");
    const userCollection = client.db("mobile-menufacturer").collection("users");
    const paymentCollection = client
      .db("mobile-menufacturer")
      .collection("payments");

    // authentication
    app.put("/login/:email", async (req, res) => {
      const email = req.body.email;
      const options = { upsert: true };
      const updateDoc = {
        $set: { email },
      };
      const filter = { email };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email }, process.env.token, {
        expiresIn: "2d",
      });
      res.send({ result, token });
    });

    // pay using card
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;

      const amount = price * 100;

      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // pay update data
    app.patch("/pay/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      console.log(payment);
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "paid",
          transactionId: payment?.transactionId,
        },
      };
      const update = await ordersCollection.updateOne(filter, updateDoc);
      const result = await paymentCollection.insertOne(payment);
      res.send(updateDoc);
    });

    // pay id to fetch for pay
    app.get("/pay/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const tool = await ordersCollection.findOne(query);
      res.send(tool);
    });

    // admin authentication
    app.get("/admin/:email", verifyJWT, async (req, res) => {
      const email = req?.params?.email;
      const decodedEmail = req?.decoded;
      if (email === decodedEmail) {
        let role;
        const query = { email };
        const user = await userCollection.findOne(query);
        if (user.role === "admin") {
          role = "admin";
        } else {
          role = "user";
        }
        res.send({ role });
      } else {
        res.status(403).send({ message: "forbidden access" });
      }
    });

    // delete a product
    app.delete("/deleteproduct/:email/:id", verifyJWT, async (req, res) => {
      const verifyMail = req?.decoded;
      const email = req?.params.email;
      const id = req.params.id;

      if (verifyMail === email) {
        const query = { _id: ObjectId(id) };
        const result = await toolsCollection.deleteOne(query);
        res.send(result);
      }
    });

    // manage all orders
    app.get("/allorders/:email", verifyJWT, async (req, res) => {
      const verifyMail = req?.decoded;
      const email = req.params.email;
      if (verifyMail === email) {
        const query = {};
        const orders = await ordersCollection.find(query).toArray();
        res.send(orders);
      }
    });

    // add a product
    app.post("/addaproduct", async (req, res) => {
      const product = req.body;
      const doc = product;
      const result = await toolsCollection.insertOne(doc);
      res.send(result);
    });

    // manage all products
    app.get("/allproducts", async (req, res) => {
      const products = await toolsCollection.find({}).toArray();
      res.send(products);
    });

    // add a review
    app.post("/addareview", verifyJWT, async (req, res) => {
      const verifyMail = req?.decoded;
      const review = req.body;
      if (verifyMail === review?.email) {
        const result = await reviewsCollection.insertOne(review);
        res.send(result);
      }
    });

    // get all data for user profile
    app.get("/userupdate/:email", verifyJWT, async (req, res) => {
      const verifyMail = req?.decoded;
      const email = req.params.email;
      if (verifyMail === email) {
        const query = { email };
        const user = await userCollection.findOne(query);
        res.send({ user });
      }
    });

    // update user profile
    app.put("/userupdate/", verifyJWT, async (req, res) => {
      const data = req.body;
      const { education, email, linkedin, location, phone, user_name } = data;
      const verifyMail = req?.decoded;
      if (verifyMail === email) {
        const query = { email };
        const user = await userCollection.findOne(query);

        const filter = { email };
        const options = { upsert: true };
        const updateDoc = {
          $set: {
            education,
            email,
            linkedin,
            location,
            phone,
            user_name,
          },
        };
        const result = await userCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.send({ result });
      }
    });

    // delete row from my order
    app.delete("/myordercancel/:id/:email", verifyJWT, async (req, res) => {
      const verifyMail = req?.decoded;
      const id = req.params.id;
      const email = req.params.email;
      if (email === verifyMail) {
        const query = { _id: ObjectId(id) };
        const result = await ordersCollection.deleteOne(query);
        res.send({ result });
      } else {
        res.send({ result: "forbidden" });
      }
    });

    // fetching data for myorder
    app.get("/myorder/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const orders = await ordersCollection.find(query).toArray();
      res.send({ orders });
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
      const tool = await toolsCollection.findOne(query);
      res.send({ tool });
    });

    app.put("/purchase/:id", verifyJWT, async (req, res) => {
      const body = req?.body;
      const mail = body?.email;
      const id = req?.params?.id;

      const query = { _id: ObjectId(id) };
      const verifyMail = req?.decoded;
      if (verifyMail === mail) {
        const doc = body;
        // insert product in order db
        const updateResult = await ordersCollection.insertOne(doc);

        // finding tool that need to update
        const tool = await toolsCollection.findOne(query);
        newQuantity = tool.available - doc.quantity;

        // updating tools available
        const options = { upsert: true };
        const filter = { _id: ObjectId(id) };
        const updateDoc = {
          $set: {
            available: newQuantity,
          },
        };
        const quantityUpdateResult = await toolsCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.send({ quantityUpdateResult });
      } else {
        res.send({ arfat: " arfat" });
      }
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

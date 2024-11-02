const express = require("express");
const cors = require("cors");

const cookieParser = require("cookie-parser");

const jwt = require("jsonwebtoken");

require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
    ],
    credentials: true, // will go to client side for this credentials
  })
);

app.use(express.json());
app.use(cookieParser());

const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("food running");
});

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ddujh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middlewares

const logger = (req, res, next) => {
  console.log("log info: ", req.method, req.url);
  next();
};

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  // console.log('token in the middleware',token);

  if (!token) {
    return res.status(401).send({ message: "User UnAuthorized Access" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "UnAuthorized Access User" });
    }

    req.user = decoded;
    next();
  });
};

const cookieOption = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  secure: process.env.NODE_ENV === "production" ? true : false,
};

async function run() {
  try {
    await client.connect();

    //  json token related

    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log("user for token", user);

      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "2hr",
      });

      res
        .cookie("token", token, cookieOption)
        .send({ success: true });
    });

    // logout releated
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);

      res.clearCookie("token", { ...cookieOption, maxAge: 0 }).send({ success: true });
    });

    const serviceCollection = client.db("khabarEkhanei").collection("services");

    // to see all the services
    app.get("/services", async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });




    
    app.post('/food', async(req,res)=>{
      const newFood = req.body; 
      console.log(newFood);

      const result = await serviceCollection.insertOne(newFood)
      
      res.send(result);
  })

   

  app.get('/food', async(req , res) => {
  const cursor = serviceCollection.find() 
  const result = await cursor.toArray();
  res.send(result)
  
  })

    







    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;

      // Validate the ID first
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid ID format" });
      }

      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 }, // 1 means this will be selected
      };
      const result = await serviceCollection.findOne(query, options);

      if (!result) {
        return res.status(404).send({ message: "Service not found" });
      }

      res.send(result);
    });

    // this is for booking any service inside database

    const bookingCollection = client.db("khabarEkhanei").collection("bookings");

    // get all the booked data
    app.get("/bookings", logger, verifyToken, async (req, res) => {
      console.log(req.query.email);

      console.log("token owner info", req.user);

      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }

      let query = {};

      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const cursor = bookingCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;

      console.log(booking);

      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    // DELETE
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };

      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    // UPDATE

    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;

      const filter = { _id: new ObjectId(id) };

      const updatedBooking = req.body;

      console.log(updatedBooking);

      const updateDoc = {
        $set: {
          status: updatedBooking.status,
        },
      };

      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`server running on port ${port}`);
});

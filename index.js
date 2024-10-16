import express from "express";
import moment from "moment";
import { CosmosClient } from "@azure/cosmos";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseName = process.env.DATABASE_NAME;
const containerName = process.env.CONTAINER_NAME;

const client = new CosmosClient({ endpoint, key });

app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

const connectToCosmosDB = async () => {
  const { database } = await client.databases.createIfNotExists({
    id: databaseName,
  });
  const { container } = await database.containers.createIfNotExists({
    id: containerName,
  });
  return container;
};

const validateAndParseDate = (dateString) => {
  const parsedDate = moment(dateString, "DD/MM/YYYY", true);
  if (!parsedDate.isValid()) {
    throw new Error("use DD/MM/YYYY format");
  }
  return parsedDate.utc().format("YYYY-MM-DDTHH:mm:ss.SSSSSSZ");
};

const storeDate = async (container, dateInput) => {
  const document = {
    id: `${Date.now()}`,
    storedDate: validateAndParseDate(dateInput),
    createdAt: new Date().toISOString(),
  };
  const { resource: createdItem } = await container.items.create(document);
  return createdItem;
};

app.post("/submit-date", async (req, res) => {
  try {
    const userDateInput = req.body.date;
    const container = await connectToCosmosDB();
    const storedItem = await storeDate(container, userDateInput);
    res.send(`Date stored successfully: ${JSON.stringify(storedItem)}`);
  } catch (error) {
    res.status(400).send(`Error: ${error.message}`);
  }
});

app.get("/get-date/:id", async (req, res) => {
  try {
    const container = await connectToCosmosDB();
    const { id } = req.params;

    const { resource: item, statusCode } = await container.item(id, id).read();

    if (!item) {
      return res.status(404).send("Item not found.");
    }

    const formattedDate = moment(item.storedDate).format("DD/MM/YYYY");

    res.send(`Date for ID ${id}: ${formattedDate}`);
  } catch (error) {
    console.error("Error while retrieving document:", error.message);
    res.status(400).send(`Error: ${error.message}`);
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

app.get("/test", (req, res) => {
  res.send("Hello, this is a test!");
});

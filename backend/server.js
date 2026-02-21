const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/geocode", async (req, res) => {
  const place = req.query.place;
  try {
    const response = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      { params: { format: "json", q: place, limit: 1 } }
    );
    if (!response.data.length) return res.status(404).json({ error: "Place not found" });
    res.json(response.data[0]);
  } catch (err) {
    res.status(500).json({ error: "Geocoding failed" });
  }
});

app.listen(3000, () => console.log("Backend running on port 3000 🚀"));
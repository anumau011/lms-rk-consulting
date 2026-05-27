const express = require('express'); // 1. Import the Express module
const app = express();              // 2. Create an Express application
const port = 5000;                  // 3. Define the port number
const mongo = require('mongoose');

// 4. Define a route for the root URL
app.get('/', (req, res) => {
  res.send('Hello World!');
});


// 5. Start the server and listen for connections
app.listen(port, () => {
  mongoose.connect("mongodb+srv://anumau333:anumau333@cluster0.ak2tvnh.mongodb.net/lms2?appName=Cluster0")
  console.log(`Server is running at http://localhost:${port}`);
});

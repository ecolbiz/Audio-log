require('dotenv').config();
const cors = require('cors');
const express = require('express');
const path = require('path');
const routes = require('./routes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.resolve('uploads')));
app.use('/api', routes);

app.listen(process.env.PORT || 3000, () => console.log('API running'));

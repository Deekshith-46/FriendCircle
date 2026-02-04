const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const Package = require('./src/models/admin/Package');
    const packages = await Package.find({ status: 'publish' });
    console.log('Published packages:', packages.length);
    packages.forEach(p => {
        console.log(`- ${p.name || 'Unnamed'}: ${p.coins} coins for ₹${p.amount}`);
    });
    process.exit(0);
});
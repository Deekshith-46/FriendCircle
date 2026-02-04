const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    try {
        const packages = await mongoose.connection.collection('packages').find({}).toArray();
        console.log('Packages in database:', packages.length);
        packages.forEach((p, i) => {
            console.log(`Package ${i + 1}:`, {
                _id: p._id,
                coin: p.coin,
                coins: p.coins,
                amount: p.amount,
                name: p.name,
                status: p.status
            });
        });
    } catch (err) {
        console.error('Error:', err.message);
    }
    process.exit(0);
});
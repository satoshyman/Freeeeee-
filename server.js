const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// مفتاح الـ API الخاص بك الذي أرسلته
const FP_API_KEY = '108ca9a526b9eed220e5a88e77fa1cf4134ceec4a3d898e442853aadcb652560'; 

app.post('/api/withdraw', async (req, res) => {
    const { email, amount } = req.body;
    try {
        const response = await axios.post('https://faucetpay.io/api/v1/send', {
            api_key: FP_API_KEY,
            amount: amount,
            to: email,
            currency: 'TON',
            referral: 'no'
        });
        res.status(200).json({ success: true, data: response.data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const express = require('express');
const router = express.Router();
const { db } = require('../firebase_Connect/fbconnect'); // firebase.js ka path adjust karo
const { authMiddleware } = require('../middleware/auth.middleware');


// helper: Firestore brand -> API brand
function mapBrand(doc) {
  const d = doc.data();

  return {
    id: doc.id,
    nameEn: d.nameEng || '',
    nameAr: d.nameArabic || '',
    phoneNumber: d.PhoneNumber || '',
    address: d.address || '',
    city: d.selectedCity || '',
    country: d.selectedCountry || '',
    category: d.selectedCategory || '',
    discountEn: d.discount || '',
    discountAr: d.discountArabic || '',
    image: d.img || '',
    menuUrl: d.menuUrl || '',
    pin: d.pin || '',
    status: d.status || '',
  };
}

function mapRedemption(doc) {
  const d = doc.data();

  return {
    id: doc.id,
    username: d.Username || '',
    brand: d.brand || '',
    code: d.code || '',
    percentage: d.percentage || '',
    phoneNumber: d.phoneNumber || '',
    date: d.date || '',
    // add if needed:
 
  };
}



// GET /api/brands -> sirf selected fields
router.get('/brands', authMiddleware, async (req, res) => {
  try {
    const snapshot = await db.collection('H-Brands').get();

    const brands = snapshot.docs.map(mapBrand);

    res.json(brands);
  } catch (err) {
    console.error('Error fetching brands:', err);
    res.status(500).json({ error: 'Failed to fetch brand data' });
  }
});


// GET /api/redemption -> selected fields only
router.get('/redemption', authMiddleware, async (req, res) => {
  try {
    const snapshot = await db.collection('hala_redeemed_discounts').get();

    const redemptions = snapshot.docs.map(mapRedemption);

    res.json(redemptions);
  } catch (err) {
    console.error('Error fetching redemption:', err);
    res.status(500).json({ error: 'Failed to fetch redemption data' });
  }
});



// POST /api/brands/by-pin
// body: { "pin": "142774" }  ya  { "pin": "easypay" }
router.post('/vender', authMiddleware, async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ error: 'pin is required in body' });
    }

    let snapshot;

    // agar pin == 'easypay' -> sare records
    if (pin.toLowerCase() === 'easypay') {
      snapshot = await db.collection('H-Brands').get();
    } else {
      // warna sirf wo brand jiska pin match karta ho
      snapshot = await db
        .collection('H-Brands')
        .where('pin', '==', pin)
        .get();
    }

    const brands = snapshot.docs.map(mapBrand);

    return res.json(brands);
  } catch (err) {
    console.error('Error fetching brands by pin:', err);
    res.status(500).json({ error: 'Failed to fetch brand data by pin' });
  }
});




// POST /api/redemption/by-pin
// body: { "pin": "142774" } or { "pin": "easypay" }
router.post('/vender/redemption', authMiddleware, async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ error: 'pin is required in body' });
    }

    let snapshot;

    // special easypay case -> return all redemption records
    if (pin.toLowerCase() === 'easypay') {
      snapshot = await db.collection('hala_redeemed_discounts').get();
    } else {
      // find redemption by PIN
      // assuming your redemption collection has a field 'pin'
      snapshot = await db
        .collection('hala_redeemed_discounts')
        .where('pin', '==', pin)
        .get();
    }

    const redemptions = snapshot.docs.map(mapRedemption);

    return res.json(redemptions);
  } catch (err) {
    console.error('Error fetching redemption by pin:', err);
    res.status(500).json({ error: 'Failed to fetch redemption data by pin' });
  }
});



module.exports = router;

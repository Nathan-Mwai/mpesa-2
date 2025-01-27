import express from "express";
import dotenv from "dotenv";
import axios from "axios";
dotenv.config();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const port = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send(`<h1>App is running at port: ${port}</h1>`);
});

//authorization(middleware)

const tokenMiddleware = async (req, res, next) => {
  try {
    //generate authorization token
    const auth = Buffer.from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString("base64");

    const MPESA_BASE_URL =
      process.env.MPESA_ENVIRONMENT === "live"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";
    const resp = await axios.get(
      `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          authorization: `Basic ${auth}`,
        },
      }
    );

    req.mpesaToken = resp.data.access_token;
    next();
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
};

//stkpush

app.post("/stk", tokenMiddleware, async (req, res) => {
  //token
  const { phoneNumber, amount } = req.body;

  //validation

  // initiate stk push

  try {
    const MPESA_BASE_URL =
      process.env.MPESA_ENVIRONMENT === "live"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";

    const date = new Date();
    const timestamp =
      date.getFullYear() +
      ("0" + (date.getMonth() + 1)).slice(-2) +
      ("0" + date.getDate()).slice(-2) +
      ("0" + date.getHours()).slice(-2) +
      ("0" + date.getMinutes()).slice(-2) +
      ("0" + date.getSeconds()).slice(-2);

    const formattedPhone = `254${phoneNumber.slice(-9)}`;
    const password = Buffer.from(
      process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp
    ).toString("base64");

    const response = await axios.post(
      `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE, // store number for tills
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline", //CustomerBuyGoodsOnline - for till
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: process.env.MPESA_SHORTCODE, //till number for tills
        PhoneNumber: formattedPhone,
        CallBackURL: "https://mydomain.com/callback-url-path",
        AccountReference: phoneNumber, //Account no.
        TransactionDesc: "anything here",
      },
      {
        headers: {
          Authorization: `Bearer ${req.mpesaToken}`,
        },
      }
    );
    return res.status(200).json({
      message: `stk sent successfully to${phoneNumber}`,
      data: response.data,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
});

//callback
app.post("callback-url-path",(req,res)=>{
    req.body

})

// stk query
app.post("/stkquery", tokenMiddleware, async (req, res) => {
  const reqId = req.body.reqId;
  try {
    const MPESA_BASE_URL =
      process.env.MPESA_ENVIRONMENT === "live"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";
    const date = new Date();
    const timestamp =
      date.getFullYear() +
      ("0" + (date.getMonth() + 1)).slice(-2) +
      ("0" + date.getDate()).slice(-2) +
      ("0" + date.getHours()).slice(-2) +
      ("0" + date.getMinutes()).slice(-2) +
      ("0" + date.getSeconds()).slice(-2);

    const password = Buffer.from(
      process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp
    ).toString("base64");

    const response = await axios.post(
      `${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`,
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: reqId,
      },
      {
        headers: {
          Authorization: `Bearer ${req.mpesaToken}`,
        },
      }
    );

    return res.status(200).json({
      
      data: response.data,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
});

//b2c

//any other

app.listen(port, () => `Server is running at ${port} `);

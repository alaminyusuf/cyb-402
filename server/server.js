require('dotenv').config()
const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const connectDB = require('./db')
const Transaction = require('./models/Transaction')

const app = express()
const PORT = process.env.PORT || 5000

// Connect to the database
connectDB()
const apiLimiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 15 minutes
	max: 5, // Limit each IP to 25 requests per windowMs
	message:
		'Too many requests from this IP, please try again after 15 minutes',
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

// Middleware to parse JSON bodies
app.use(express.json())
app.use(
	express.urlencoded({
		extended: true,
	})
)
app.use(cors({ origin: true }))
// Apply to all requests
app.use(apiLimiter)

// --- API Routes ---

// @route   GET /api/transactions
// @desc    Get all transactions
// @access  Public
app.get('/api/transactions', async (req, res) => {
	try {
		const transactions = await Transaction.find().sort({ createdAt: -1 })
		res.status(200).json({
			success: true,
			count: transactions.length,
			data: transactions,
		})
	} catch (error) {
		res.status(500).json({ success: false, error: 'Server Error' })
	}
})

// @route   POST /api/transactions
// @desc    Add a new transaction
// @access  Public
app.post('/api/transactions', async (req, res) => {
	try {
		const transaction = await Transaction.create(req.body)
		res.status(201).json({ success: true, data: transaction })
	} catch (error) {
		if (error.name === 'ValidationError') {
			const messages = Object.values(error.errors).map(
				(val) => val.message
			)
			return res.status(400).json({ success: false, error: messages })
		} else {
			res.status(500).json({ success: false, error: 'Server Error' })
		}
	}
})

// @route   PUT /api/transactions/:id
// @desc    Update a transaction
// @access  Public
app.put('/api/transactions/:id', async (req, res) => {
	try {
		let transaction = await Transaction.findById(req.params.id)
		if (!transaction) {
			return res
				.status(404)
				.json({ success: false, error: 'Transaction not found' })
		}
		transaction = await Transaction.findByIdAndUpdate(
			req.params.id,
			req.body,
			{
				new: true, // Return the updated document
				runValidators: true, // Run validators on update
			}
		)
		res.status(200).json({ success: true, data: transaction })
	} catch (error) {
		res.status(500).json({ success: false, error: 'Server Error' })
	}
})

// @route   DELETE /api/transactions/:id
// @desc    Delete a transaction
// @access  Public
app.delete('/api/transactions/:id', async (req, res) => {
	try {
		const transaction = await Transaction.findById(req.params.id)
		if (!transaction) {
			return res
				.status(404)
				.json({ success: false, error: 'Transaction not found' })
		}
		await transaction.remove()
		res.status(200).json({ success: true, data: {} })
	} catch (error) {
		res.status(500).json({ success: false, error: 'Server Error' })
	}
})

// Start the server
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`)
})

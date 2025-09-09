require('dotenv').config()
const express = require('express')
const connectDB = require('./db')
const Transaction = require('./models/Transaction')
const cluster = require('cluster')
const os = require('os')

const numCPUs = os.cpus().length // Get the number of CPU cores

const app = express()
const PORT = process.env.PORT || 5000

app.use(express.json())

// --- API Routes (Worker Process Only) ---
// @route   GET /api/transactions
// ... (your existing GET, POST, PUT, DELETE routes go here) ...
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

app.post('/api/transactions', async (req, res) => {
	// Simulate fail in frontend
	if (req.headers['x-emulate-fault'] === 'omission') {
		console.log('Emulating an omission fault: not sending a response.')
		return // Don't send a response. The client will time out.
	}

	try {
		// Check if this request has already been processed
		const existingTransaction = await Transaction.findOne({ requestId })
		if (existingTransaction) {
			console.log(
				'Duplicate request detected. Returning existing transaction.'
			)
			return res.status(200).json({
				success: true,
				data: existingTransaction,
				message: 'Request already processed.',
			})
		}

		// Process the new transaction, including the request ID
		const newTransaction = await Transaction.create({
			...req.body,
			requestId,
		})
		res.status(201).json({ success: true, data: newTransaction })
	} catch (error) {
		if (error.name === 'ValidationError' || error.code === 11000) {
			// 11000 is for unique key errors
			const messages = Object.values(error.errors).map(
				(val) => val.message
			)
			return res.status(400).json({ success: false, error: messages })
		}
		res.status(500).json({ success: false, error: 'Server Error' })
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

// A special route to test crashing a worker process
app.get('/crash', (req, res) => {
	res.status(200).send('Crashing worker process...')
	process.exit(1) // Force an exit with a non-zero status code
})

if (cluster.isPrimary) {
	// This is the master process
	console.log(`Master process ${process.pid} is running`)

	// Fork workers for each CPU core
	for (let i = 0; i < numCPUs; i++) {
		cluster.fork()
	}

	// Listen for workers exiting
	cluster.on('exit', (worker, code, signal) => {
		console.log(
			`Worker process ${worker.process.pid} died. Code: ${code}, Signal: ${signal}`
		)
		console.log('Restarting a new worker...')
		cluster.fork() // Fork a new worker to replace the dead one
	})
} else {
	// This is a worker process
	console.log(`Worker process ${process.pid} is running`)

	// Connect to the database and start the Express server
	connectDB()
	app.listen(PORT, () => {
		console.log(`Worker ${process.pid} listening on port ${PORT}`)
	})
}

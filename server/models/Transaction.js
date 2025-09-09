const mongoose = require('mongoose')

const transactionSchema = new mongoose.Schema({
	description: {
		type: String,
		required: [true, 'Please add a description.'],
		trim: true,
	},
	amount: {
		type: Number,
		required: [true, 'Please add a positive or negative amount.'],
	},
	type: {
		type: String,
		enum: ['income', 'expense'],
		required: [true, 'Please specify if it is an income or expense.'],
	},
	category: {
		type: String,
		trim: true,
		default: 'Uncategorized',
	},
	requestId: {
		type: String,
		unique: true,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
})

const Transaction = mongoose.model('Transaction', transactionSchema)

module.exports = Transaction

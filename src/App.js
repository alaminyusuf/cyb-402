import './App.css'

import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Modal from 'react-modal'
import axiosRetry from 'axios-retry'
import { v4 as uuidv4 } from 'uuid'
import {
	CurrencyDollarIcon,
	ArrowUpCircleIcon,
	ArrowDownCircleIcon,
	PencilIcon,
	TrashIcon,
} from '@heroicons/react/24/outline'
import { CurrencyDollarIcon as CurrencyDollarIconSolid } from '@heroicons/react/24/solid'

// Set up the modal root element
Modal.setAppElement('#root')

axiosRetry(axios, {
	retries: 3, // Number of retry attempts
	retryDelay: (retryCount) => {
		// Exponential backoff strategy
		return retryCount * 1000
	},
	retryCondition: (error) => {
		// Retry on a timeout (omission fault) or server error
		return (
			axiosRetry.isNetworkError(error) ||
			axiosRetry.isRetryableError(error)
		)
	},
})

const API_URL = 'http://localhost:5000/api/transactions'

const App = () => {
	const [transactions, setTransactions] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)
	const [formData, setFormData] = useState({
		description: '',
		amount: '',
		type: 'expense',
		category: '',
	})
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [currentTransaction, setCurrentTransaction] = useState(null)

	useEffect(() => {
		fetchTransactions()
	}, [])

	const fetchTransactions = async () => {
		setLoading(true)
		try {
			const response = await axios.get(API_URL)
			setTransactions(response.data.data)
			setError(null)
		} catch (err) {
			console.error('Error fetching transactions:', err)
			setError('Failed to fetch transactions. Is the backend running?')
		} finally {
			setLoading(false)
		}
	}

	const handleChange = (e) => {
		const { name, value } = e.target
		setFormData({ ...formData, [name]: value })
	}

	const handleAddSubmit = async (e) => {
		e.preventDefault()
		try {
			const newTransaction = {
				...formData,
				amount:
					formData.type === 'expense'
						? -Math.abs(Number(formData.amount))
						: Math.abs(Number(formData.amount)),
			}
			const config = {
				headers: {
					'X-Request-Id': uuidv4(),
					// To emulate the fault: 'X-Emulate-Fault': 'omission'
				},
			}

			await axios.post(API_URL, newTransaction, config)
			setFormData({
				description: '',
				amount: '',
				type: 'expense',
				category: '',
			})
			fetchTransactions()
		} catch (err) {
			console.error('Error adding transaction:', err.response?.data || err)
			setError('Failed to add transaction after multiple retries.')
		}
	}

	const handleEditSubmit = async (e) => {
		e.preventDefault()
		try {
			const updatedTransaction = {
				...currentTransaction,
				amount:
					currentTransaction.type === 'expense'
						? -Math.abs(Number(currentTransaction.amount))
						: Math.abs(Number(currentTransaction.amount)),
			}
			await axios.put(
				`${API_URL}/${currentTransaction._id}`,
				updatedTransaction
			)
			setIsModalOpen(false)
			fetchTransactions()
		} catch (err) {
			console.error(
				'Error editing transaction:',
				err.response?.data || err
			)
			setError('Failed to edit transaction.')
		}
	}

	const handleDelete = async (id) => {
		if (
			window.confirm('Are you sure you want to delete this transaction?')
		) {
			try {
				await axios.delete(`${API_URL}/${id}`)
				fetchTransactions()
			} catch (err) {
				console.error('Error deleting transaction:', err)
				setError('Failed to delete transaction.')
			}
		}
	}

	const openEditModal = (transaction) => {
		setCurrentTransaction({
			...transaction,
			// Ensure amount is positive for the form input
			amount: Math.abs(transaction.amount),
		})
		setIsModalOpen(true)
	}

	const totalBalance = transactions
		.reduce((acc, t) => acc + t.amount, 0)
		.toFixed(2)
	const totalIncome = transactions
		.filter((t) => t.amount > 0)
		.reduce((acc, t) => acc + t.amount, 0)
		.toFixed(2)
	const totalExpenses = transactions
		.filter((t) => t.amount < 0)
		.reduce((acc, t) => acc + t.amount, 0)
		.toFixed(2)

	const formatAmount = (amount) => {
		const sign = amount < 0 ? '-' : '+'
		const color = amount < 0 ? 'text-red-500' : 'text-green-500'
		return (
			<span className={color}>
				{sign}${Math.abs(amount).toFixed(2)}
			</span>
		)
	}

	const balanceColor =
		totalBalance < 0
			? 'text-red-500'
			: totalBalance > 0
			? 'text-green-500'
			: 'text-gray-500'

	return (
		<div className='min-h-screen bg-gray-100 p-4 font-sans antialiased'>
			<div className='container mx-auto max-w-4xl'>
				<h1 className='text-3xl font-extrabold text-center text-gray-800 mb-5'>
					<CurrencyDollarIconSolid className='inline-block w-8 h-8 mr-2 text-red-600' />
					Finance Tracker
				</h1>

				{/* Summary Dashboard */}
				<div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
					{/* Balance Card */}
					<div className='bg-white rounded-lg shadow-md p-6 flex flex-col items-center justify-center'>
						<CurrencyDollarIcon className='w-10 h-10 text-gray-400 mb-2' />
						<h2 className='text-xl font-semibold text-gray-700'>
							Balance
						</h2>
						<p className={`text-3xl font-bold ${balanceColor}`}>
							{totalBalance}
						</p>
					</div>
					{/* Income Card */}
					<div className='bg-white rounded-lg shadow-md p-6 flex flex-col items-center justify-center'>
						<ArrowUpCircleIcon className='w-10 h-10 text-green-500 mb-2' />
						<h2 className='text-xl font-semibold text-gray-700'>Income</h2>
						<p className='text-3xl font-bold text-green-500'>
							${totalIncome}
						</p>
					</div>
					{/* Expenses Card */}
					<div className='bg-white rounded-lg shadow-md p-6 flex flex-col items-center justify-center'>
						<ArrowDownCircleIcon className='w-10 h-10 text-red-500 mb-2' />
						<h2 className='text-xl font-semibold text-gray-700'>
							Expenses
						</h2>
						<p className='text-3xl font-bold text-red-500'>
							${Math.abs(totalExpenses).toFixed(2)}
						</p>
					</div>
				</div>

				{/* Error Message */}
				{error && (
					<div className='bg-red-100 text-red-700 p-4 rounded-md mb-6'>
						{error}
					</div>
				)}

				{/* Add Transaction Form */}
				<div className='bg-white p-6 rounded-lg shadow-md mb-8'>
					<h2 className='text-2xl font-semibold text-gray-800 mb-4'>
						Add New Transaction
					</h2>
					<form onSubmit={handleAddSubmit} className='space-y-4'>
						<input
							type='text'
							name='description'
							placeholder='Description'
							value={formData.description}
							onChange={handleChange}
							className='w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent'
							required
						/>
						<div className='flex gap-4'>
							<input
								type='number'
								name='amount'
								placeholder='Amount'
								value={formData.amount}
								onChange={handleChange}
								className='w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent'
								required
							/>
							<select
								name='type'
								value={formData.type}
								onChange={handleChange}
								className='w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent'
							>
								<option value='expense'>Expense</option>
								<option value='income'>Income</option>
							</select>
						</div>
						<input
							type='text'
							name='category'
							placeholder='Category (e.g., Food, Salary)'
							value={formData.category}
							onChange={handleChange}
							className='w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent'
						/>
						<button
							type='submit'
							className='w-full p-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition duration-200'
						>
							Add Transaction
						</button>
					</form>
				</div>

				{/* Transaction History */}
				<div className='bg-white p-6 rounded-lg shadow-md'>
					<h2 className='text-2xl font-semibold text-gray-800 mb-4'>
						Transaction History
					</h2>
					{loading ? (
						<p className='text-center text-gray-500'>
							Loading transactions...
						</p>
					) : transactions.length === 0 ? (
						<p className='text-center text-gray-500'>
							No transactions found.
						</p>
					) : (
						<ul className='divide-y divide-gray-200'>
							{transactions.map((transaction) => (
								<li
									key={transaction._id}
									className='flex items-center justify-between py-4'
								>
									<div>
										<p className='text-lg font-medium text-gray-800'>
											{transaction.description}
										</p>
										<p className='text-sm text-gray-500'>
											{transaction.category} &bull;{' '}
											{new Date(
												transaction.createdAt
											).toLocaleDateString()}
										</p>
									</div>
									<div className='flex items-center space-x-4'>
										<p className='text-lg font-semibold'>
											{formatAmount(transaction.amount)}
										</p>
										<button
											onClick={() => openEditModal(transaction)}
											className='text-gray-500 hover:text-blue-500 transition duration-200'
											aria-label='Edit transaction'
										>
											<PencilIcon className='w-5 h-5' />
										</button>
										<button
											onClick={() => handleDelete(transaction._id)}
											className='text-gray-500 hover:text-red-500 transition duration-200'
											aria-label='Delete transaction'
										>
											<TrashIcon className='w-5 h-5' />
										</button>
									</div>
								</li>
							))}
						</ul>
					)}
				</div>

				{/* Edit Transaction Modal */}
				<Modal
					isOpen={isModalOpen}
					onRequestClose={() => setIsModalOpen(false)}
					className='bg-white p-6 rounded-lg shadow-xl outline-none max-w-lg mx-auto my-12'
					overlayClassName='fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center'
				>
					{currentTransaction && (
						<div>
							<h2 className='text-2xl font-semibold text-gray-800 mb-4'>
								Edit Transaction
							</h2>
							<form onSubmit={handleEditSubmit} className='space-y-4'>
								<input
									type='text'
									name='description'
									placeholder='Description'
									value={currentTransaction.description}
									onChange={(e) =>
										setCurrentTransaction({
											...currentTransaction,
											description: e.target.value,
										})
									}
									className='w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
									required
								/>
								<div className='flex gap-4'>
									<input
										type='number'
										name='amount'
										placeholder='Amount'
										value={currentTransaction.amount}
										onChange={(e) =>
											setCurrentTransaction({
												...currentTransaction,
												amount: e.target.value,
											})
										}
										className='w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
										required
									/>
									<select
										name='type'
										value={currentTransaction.type}
										onChange={(e) =>
											setCurrentTransaction({
												...currentTransaction,
												type: e.target.value,
											})
										}
										className='w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
									>
										<option value='expense'>Expense</option>
										<option value='income'>Income</option>
									</select>
								</div>
								<input
									type='text'
									name='category'
									placeholder='Category'
									value={currentTransaction.category}
									onChange={(e) =>
										setCurrentTransaction({
											...currentTransaction,
											category: e.target.value,
										})
									}
									className='w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
								/>
								<div className='flex justify-end gap-2'>
									<button
										type='button'
										onClick={() => setIsModalOpen(false)}
										className='px-4 py-2 bg-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-400 transition duration-200'
									>
										Cancel
									</button>
									<button
										type='submit'
										className='px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition duration-200'
									>
										Save Changes
									</button>
								</div>
							</form>
						</div>
					)}
				</Modal>
			</div>
		</div>
	)
}

export default App

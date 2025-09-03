import './App.css'

export default function Home() {
	const [input, setInput] = useState('')
	const chechInput = async (e) => {
		e.preventDefault()
		console.log(input)
	}
	return (
		<div className={`font-sans items-center justify-items-center`}>
			<main className='vw-45 mt-20'>
				<h1 className='text-left text-2xl uppercase'> Next IDS</h1>
				<form
					onSubmit={chechInput}
					className='border border-solid border-cyan-500 border-2px p-10 mt-2 rounded'
				>
					<input
						className='border border-solid border-cyan-500 border-2px my-5 p-2 bg-gray-900'
						value={input}
						onChange={(e) => {
							setInput(e.target.value)
						}}
					/>
					<button
						type='submit'
						className='block p-2 border border-solid border-cyan-500 border-2px rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 transition duration-200 ease-in-out'
					>
						SUBMIT
					</button>
				</form>
			</main>
		</div>
	)
}

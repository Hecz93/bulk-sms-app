import React from 'react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { Dashboard } from './components/Dashboard'

function App() {
    return (
        <>
            <Dashboard />
            <SpeedInsights />
        </>
    )
}

export default App

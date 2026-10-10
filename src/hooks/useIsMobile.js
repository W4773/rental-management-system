import { useEffect, useState } from 'react'

const QUERY = '(max-width: 767px)'

/** true on phones (< 768px); updates when the window is resized or the phone is rotated. */
export default function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(QUERY).matches)

    useEffect(() => {
        const mq = window.matchMedia(QUERY)
        const onChange = (e) => setIsMobile(e.matches)
        setIsMobile(mq.matches)
        mq.addEventListener('change', onChange)
        return () => mq.removeEventListener('change', onChange)
    }, [])

    return isMobile
}

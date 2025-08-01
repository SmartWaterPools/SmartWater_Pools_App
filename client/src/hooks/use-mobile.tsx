import * as React from "react"

const MOBILE_BREAKPOINT = 1024 // Increased from 768 to 1024 for better tablet/mobile detection

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false) // Default to false instead of undefined

  React.useEffect(() => {
    const checkIsMobile = () => {
      // Use multiple detection methods for better accuracy
      const width = window.innerWidth
      const userAgent = navigator.userAgent
      const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
      const isMobileWidth = width < MOBILE_BREAKPOINT
      
      // Consider it mobile if either condition is true
      return isMobileUserAgent || isMobileWidth
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(checkIsMobile())
    }
    
    // Add touch capability detection
    const mqlTouch = window.matchMedia('(hover: none) and (pointer: coarse)')
    const onTouchChange = () => {
      setIsMobile(checkIsMobile())
    }

    mql.addEventListener("change", onChange)
    mqlTouch.addEventListener("change", onTouchChange)
    
    // Initial check
    setIsMobile(checkIsMobile())
    
    return () => {
      mql.removeEventListener("change", onChange)
      mqlTouch.removeEventListener("change", onTouchChange)
    }
  }, [])

  return isMobile
}

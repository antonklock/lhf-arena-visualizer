import * as THREE from 'three'
import { ArenaVisualizer } from './components/ArenaVisualizer'

// Setup collapsible panels
function setupCollapsiblePanels(): void {
  const panels = document.querySelectorAll('.plane-info, .videos-panel')
  
  panels.forEach(panel => {
    const header = panel.querySelector('h3')
    if (header) {
      header.addEventListener('click', () => {
        panel.classList.toggle('collapsed')
      })
    }
  })
}

// Setup video controls
function setupVideoControls(): void {
  // Handle refresh button clicks
  const refreshButtons = document.querySelectorAll('.refresh-btn')
  refreshButtons.forEach(button => {
    button.addEventListener('click', () => {
      const planeName = button.getAttribute('data-plane')
      const input = document.querySelector(`.video-input[data-plane="${planeName}"]`) as HTMLInputElement
      
      if (input && planeName) {
        handleVideoRefresh(planeName, input.value)
      }
    })
  })
  
  // Handle input field changes
  const videoInputs = document.querySelectorAll('.video-input')
  videoInputs.forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const planeName = (input as HTMLInputElement).getAttribute('data-plane')
        const value = (input as HTMLInputElement).value
        
        if (planeName) {
          handleVideoRefresh(planeName, value)
        }
      }
    })
  })
}

// Handle video refresh/load
function handleVideoRefresh(planeName: string, url: string): void {
  console.log(`Refreshing ${planeName} with URL: ${url}`)
  
  // Add visual feedback
  const button = document.querySelector(`.refresh-btn[data-plane="${planeName}"]`)
  if (button) {
    button.classList.add('loading')
    
    // Simulate loading with animation
    let rotation = 0
    const animateButton = () => {
      rotation += 45
      ;(button as HTMLElement).style.transform = `rotate(${rotation}deg) scale(0.95)`
      
      if (rotation < 360) {
        setTimeout(animateButton, 100)
      } else {
        ;(button as HTMLElement).style.transform = ''
        button.classList.remove('loading')
      }
    }
    
    animateButton()
  }
  
  // Here you would typically load the video onto the corresponding plane
  // For now, we'll just log it and provide visual feedback
  if (url.trim()) {
    console.log(`Loading video for ${planeName}: ${url}`)
    // TODO: Implement actual video loading onto the 3D plane
  } else {
    console.log(`Clearing video for ${planeName}`)
    // TODO: Implement clearing video from the 3D plane
  }
}

// Initialize the application
function init(): void {
  const app = document.getElementById('app')
  if (!app) {
    throw new Error('App container not found')
  }

  // Create and start the arena visualizer
  const visualizer = new ArenaVisualizer(app)
  visualizer.start()

  // Handle window resize
  window.addEventListener('resize', () => {
    visualizer.handleResize()
  })

  // Add hover functionality for plane legend
  const planeItems = document.querySelectorAll('.plane-item')
  planeItems.forEach(item => {
    item.addEventListener('mouseenter', () => {
      const planeName = item.getAttribute('data-plane')
      if (planeName) {
        visualizer.getArena().highlightPlane(planeName)
      }
    })
    
    item.addEventListener('mouseleave', () => {
      visualizer.getArena().resetHighlight()
    })
  })

  // Add collapsible panel functionality
  setupCollapsiblePanels()
  
  // Add video input functionality
  setupVideoControls()

  // Add to window for debugging
  ;(window as any).THREE = THREE
  ;(window as any).visualizer = visualizer
}

// Start the application when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

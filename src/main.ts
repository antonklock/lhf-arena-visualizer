import * as THREE from 'three'
import { ArenaVisualizer } from './components/ArenaVisualizer'

// Setup collapsible panels
function setupCollapsiblePanels(): void {
  const panels = document.querySelectorAll('.plane-info, .videos-panel')
  const planeInfoPanel = document.querySelector('.plane-info') as HTMLElement
  const videosPanel = document.querySelector('.videos-panel') as HTMLElement
  
  // Function to update videos panel position
  function updateVideosPanelPosition() {
    if (planeInfoPanel && videosPanel) {
      const planeInfoHeight = planeInfoPanel.offsetHeight
      const gap = 10 // 10px gap between panels
      document.documentElement.style.setProperty('--plane-info-height', `${planeInfoHeight + gap}px`)
    }
  }
  
  // Initial positioning
  setTimeout(updateVideosPanelPosition, 50)
  
  panels.forEach(panel => {
    const header = panel.querySelector('h3')
    if (header) {
      header.addEventListener('click', () => {
        panel.classList.toggle('collapsed')
        // Update positioning immediately for faster response
        requestAnimationFrame(updateVideosPanelPosition)
        // Also update after transition completes for accuracy
        setTimeout(updateVideosPanelPosition, 300)
      })
    }
  })
  
  // Update position on window resize
  window.addEventListener('resize', updateVideosPanelPosition)
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
  
  // Handle file button clicks
  const fileButtons = document.querySelectorAll('.file-btn')
  fileButtons.forEach(button => {
    button.addEventListener('click', () => {
      const planeName = button.getAttribute('data-plane')
      const fileInput = document.querySelector(`.file-input[data-plane="${planeName}"]`) as HTMLInputElement
      
      if (fileInput) {
        fileInput.click()
      }
    })
  })
  
  // Handle file input changes
  const fileInputs = document.querySelectorAll('.file-input')
  fileInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      const planeName = (input as HTMLInputElement).getAttribute('data-plane')
      const file = (e.target as HTMLInputElement).files?.[0]
      
      if (planeName && file) {
        const textInput = document.querySelector(`.video-input[data-plane="${planeName}"]`) as HTMLInputElement
        if (textInput) {
          textInput.value = file.name // Show filename in text input
        }
        handleVideoRefreshFromFile(planeName, file)
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

// Handle video refresh/load from file
async function handleVideoRefreshFromFile(planeName: string, file: File): Promise<void> {
  console.log(`Loading video file for ${planeName}:`, file.name)
  
  // Get the visualizer instance from the global scope
  const visualizer = (window as any).visualizer
  if (!visualizer) {
    console.error('Visualizer not found')
    return
  }

  // Add visual feedback
  const button = document.querySelector(`.file-btn[data-plane="${planeName}"]`) as HTMLElement
  const input = document.querySelector(`.video-input[data-plane="${planeName}"]`) as HTMLInputElement
  
  if (button) {
    button.classList.add('loading')
    button.style.pointerEvents = 'none'
  }
  
  try {
    // Load video file onto the plane
    const success = await visualizer.getArena().loadVideoOnPlane(planeName, file)
    
    if (success) {
      // Update input styling to show success
      if (input) {
        input.style.borderColor = '#4ecdc4'
        input.style.backgroundColor = 'rgba(78, 205, 196, 0.1)'
      }
      console.log(`Successfully loaded video file on ${planeName}`)
    } else {
      // Update input styling to show error
      if (input) {
        input.style.borderColor = '#ff6b6b'
        input.style.backgroundColor = 'rgba(255, 107, 107, 0.1)'
      }
      console.error(`Failed to load video file on ${planeName}`)
    }
  } catch (error) {
    console.error(`Error handling video file for ${planeName}:`, error)
    // Update input styling to show error
    if (input) {
      input.style.borderColor = '#ff6b6b'
      input.style.backgroundColor = 'rgba(255, 107, 107, 0.1)'
    }
  } finally {
    // Remove loading state
    if (button) {
      setTimeout(() => {
        button.classList.remove('loading')
        button.style.pointerEvents = ''
      }, 500)
    }
  }
}

// Handle video refresh/load
async function handleVideoRefresh(planeName: string, url: string): Promise<void> {
  console.log(`Refreshing ${planeName} with URL: ${url}`)
  
  // Get the visualizer instance from the global scope
  const visualizer = (window as any).visualizer
  if (!visualizer) {
    console.error('Visualizer not found')
    return
  }

  // Add visual feedback
  const button = document.querySelector(`.refresh-btn[data-plane="${planeName}"]`) as HTMLElement
  const input = document.querySelector(`.video-input[data-plane="${planeName}"]`) as HTMLInputElement
  
  if (button) {
    button.classList.add('loading')
    button.style.pointerEvents = 'none'
    
    // Animate loading
    let rotation = 0
    const animateButton = () => {
      rotation += 45
      button.style.transform = `rotate(${rotation}deg) scale(0.95)`
      
      if (rotation < 360 && button.classList.contains('loading')) {
        setTimeout(animateButton, 100)
      }
    }
    animateButton()
  }
  
  try {
    if (url.trim()) {
      // Load video onto the plane
      console.log(`Loading video for ${planeName}: ${url}`)
      const success = await visualizer.getArena().loadVideoOnPlane(planeName, url.trim())
      
      if (success) {
        // Update input styling to show success
        if (input) {
          input.style.borderColor = '#4ecdc4'
          input.style.backgroundColor = 'rgba(78, 205, 196, 0.1)'
        }
        console.log(`Successfully loaded video on ${planeName}`)
      } else {
        // Update input styling to show error
        if (input) {
          input.style.borderColor = '#ff6b6b'
          input.style.backgroundColor = 'rgba(255, 107, 107, 0.1)'
        }
        console.error(`Failed to load video on ${planeName}`)
      }
    } else {
      // Clear video from the plane
      console.log(`Clearing video for ${planeName}`)
      visualizer.getArena().clearVideoFromPlane(planeName)
      
      // Reset input styling
      if (input) {
        input.style.borderColor = '#444'
        input.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
      }
    }
  } catch (error) {
    console.error(`Error handling video for ${planeName}:`, error)
    // Update input styling to show error
    if (input) {
      input.style.borderColor = '#ff6b6b'
      input.style.backgroundColor = 'rgba(255, 107, 107, 0.1)'
    }
  } finally {
    // Remove loading state
    if (button) {
      setTimeout(() => {
        button.classList.remove('loading')
        button.style.transform = ''
        button.style.pointerEvents = ''
      }, 500) // Small delay to show completion
    }
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

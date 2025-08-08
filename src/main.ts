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

// Setup timeline controls
function setupTimelineControls(): void {
  const playBtn = document.querySelector('.timeline-btn.play') as HTMLElement
  const pauseBtn = document.querySelector('.timeline-btn.pause') as HTMLElement
  const stopBtn = document.querySelector('.timeline-btn.stop') as HTMLElement
  const timelineTrack = document.querySelector('.timeline-track') as HTMLElement
  const timelineProgress = document.querySelector('.timeline-progress') as HTMLElement
  const timelineHandle = document.querySelector('.timeline-handle') as HTMLElement
  const currentTimeSpan = document.querySelector('.current-time') as HTMLElement
  const totalTimeSpan = document.querySelector('.total-time') as HTMLElement
  const videoCountSpan = document.querySelector('.video-count') as HTMLElement

  let isDragging = false
  let animationFrameId: number | null = null

  // Get visualizer instance
  const getVisualizer = () => (window as any).visualizer

  // Format time helper
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Update timeline display
  const updateTimelineDisplay = () => {
    const visualizer = getVisualizer()
    if (!visualizer) return

    const info = visualizer.getArena().getVideoPlaybackInfo()
    
    // Update time displays
    currentTimeSpan.textContent = formatTime(info.currentTime)
    totalTimeSpan.textContent = formatTime(info.duration)
    videoCountSpan.textContent = `${info.videoCount} video${info.videoCount !== 1 ? 's' : ''}`

    // Update progress bar
    if (info.duration > 0 && !isDragging) {
      const percentage = (info.currentTime / info.duration) * 100
      timelineProgress.style.width = `${percentage}%`
      timelineHandle.style.left = `${percentage}%`
    }

    // Continue updating if videos are playing
    if (info.isPlaying && info.videoCount > 0) {
      animationFrameId = requestAnimationFrame(updateTimelineDisplay)
    } else {
      animationFrameId = null
    }
  }

  // Play button
  playBtn.addEventListener('click', () => {
    const visualizer = getVisualizer()
    if (visualizer) {
      visualizer.getArena().playAllVideos()
      // Start timeline updates
      if (!animationFrameId) {
        updateTimelineDisplay()
      }
    }
  })

  // Pause button
  pauseBtn.addEventListener('click', () => {
    const visualizer = getVisualizer()
    if (visualizer) {
      visualizer.getArena().pauseAllVideos()
      // Stop timeline updates
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }
    }
  })

  // Stop button
  stopBtn.addEventListener('click', () => {
    const visualizer = getVisualizer()
    if (visualizer) {
      visualizer.getArena().stopAndRewindAllVideos()
      // Stop timeline updates and reset display
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }
      // Reset timeline to beginning
      timelineProgress.style.width = '0%'
      timelineHandle.style.left = '0%'
      setTimeout(updateTimelineDisplay, 100) // Brief delay to let videos reset
    }
  })

  // Timeline seeking
  const handleSeek = (event: MouseEvent) => {
    const rect = timelineTrack.getBoundingClientRect()
    const percentage = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100))
    
    const visualizer = getVisualizer()
    if (visualizer) {
      visualizer.getArena().seekAllVideos(percentage)
      
      // Update UI immediately
      timelineProgress.style.width = `${percentage}%`
      timelineHandle.style.left = `${percentage}%`
    }
  }

  // Mouse events for timeline
  timelineTrack.addEventListener('mousedown', (e) => {
    isDragging = true
    handleSeek(e)
  })

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      handleSeek(e)
    }
  })

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false
      // Resume timeline updates if videos are playing
      const visualizer = getVisualizer()
      if (visualizer) {
        const info = visualizer.getArena().getVideoPlaybackInfo()
        if (info.isPlaying && !animationFrameId) {
          updateTimelineDisplay()
        }
      }
    }
  })

  // Initial timeline display update
  updateTimelineDisplay()
  
  // Update display when videos are loaded/unloaded
  setInterval(updateTimelineDisplay, 1000) // Update every second as backup
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

  // Add timeline control functionality
  setupTimelineControls()

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

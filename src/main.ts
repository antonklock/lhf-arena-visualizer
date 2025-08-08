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

// Setup mode toggle
function setupModeToggle(): void {
  const modeToggle = document.getElementById('mode-toggle') as HTMLElement
  const mode2DLabel = document.querySelector('.mode-label[data-mode="2d"]') as HTMLElement
  const mode3DLabel = document.querySelector('.mode-label[data-mode="3d"]') as HTMLElement
  
  let currentMode: '2d' | '3d' = '3d'
  
  // Initialize UI to show 3D mode as active
  modeToggle.classList.add('active')
  mode2DLabel.classList.remove('active')
  mode3DLabel.classList.add('active')
  
  // Get visualizer instance
  const getVisualizer = () => (window as any).visualizer
  
  // Toggle between 2D and 3D modes
  const toggleMode = () => {
    const visualizer = getVisualizer()
    if (!visualizer) return
    
    currentMode = currentMode === '2d' ? '3d' : '2d'
    
    // Update UI state
    if (currentMode === '3d') {
      modeToggle.classList.add('active')
      mode2DLabel.classList.remove('active')
      mode3DLabel.classList.add('active')
    } else {
      modeToggle.classList.remove('active')
      mode2DLabel.classList.add('active')
      mode3DLabel.classList.remove('active')
    }
    
    // Update Arena mode
    visualizer.getArena().setMode(currentMode)
    
    console.log(`Switched to ${currentMode.toUpperCase()} mode`)
  }
  
  // Add click event listeners
  modeToggle.addEventListener('click', toggleMode)
  
  // Also allow clicking on labels to toggle
  mode2DLabel.addEventListener('click', () => {
    if (currentMode !== '2d') toggleMode()
  })
  
  mode3DLabel.addEventListener('click', () => {
    if (currentMode !== '3d') toggleMode()
  })
}

// Setup model version control
function setupModelVersionControl(): void {
  const modelVersionInput = document.getElementById('model-version') as HTMLInputElement
  const loadModelBtn = document.getElementById('load-model') as HTMLButtonElement
  
  // Get visualizer instance
  const getVisualizer = () => (window as any).visualizer
  
  // Sync UI with current model version from Arena
  const syncUIWithModelVersion = () => {
    const visualizer = getVisualizer()
    if (visualizer) {
      const currentVersion = visualizer.getArena().getModelVersion()
      modelVersionInput.value = currentVersion.toString()
      console.log(`UI synced with model version: ${currentVersion}`)
    }
  }
  
  // Handle load model button click
  const loadModelVersion = async () => {
    const visualizer = getVisualizer()
    if (!visualizer) return
    
    const version = parseInt(modelVersionInput.value)
    if (isNaN(version) || version < 1 || version > 10) {
      console.warn('Invalid model version. Please enter a number between 1 and 10.')
      return
    }
    
    console.log(`Loading model version ${version}...`)
    
    // Add loading state to button
    loadModelBtn.textContent = 'Loading...'
    loadModelBtn.disabled = true
    
    try {
      await visualizer.getArena().setModelVersion(version)
      console.log(`Successfully loaded model version ${version}`)
      loadModelBtn.textContent = 'Loaded!'
      
      // Reset button text after a delay
      setTimeout(() => {
        loadModelBtn.textContent = 'Load'
        loadModelBtn.disabled = false
      }, 1500)
    } catch (error) {
      console.error('Failed to load model version:', error)
      loadModelBtn.textContent = 'Error'
      
      // Reset button text after a delay
      setTimeout(() => {
        loadModelBtn.textContent = 'Load'
        loadModelBtn.disabled = false
      }, 2000)
    }
  }
  
  // Add event listeners
  loadModelBtn.addEventListener('click', loadModelVersion)
  
  // Also allow Enter key to load model
  modelVersionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loadModelVersion()
    }
  })
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
      // Update lighting for playing state
      visualizer.updateLightingBasedOnVideoState()
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
      // Update lighting for paused state
      visualizer.updateLightingBasedOnVideoState()
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
      // Update lighting for paused state
      visualizer.updateLightingBasedOnVideoState()
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
  const autoDetectCheckbox = document.getElementById('auto-detect-videos') as HTMLInputElement
  
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
        // Check if auto-detect is enabled
        if (autoDetectCheckbox && autoDetectCheckbox.checked) {
          // Enable multiple file selection for auto-detect
          fileInput.multiple = true
          console.log('Multiple file selection enabled for auto-detection')
        } else {
          // Single file selection for individual plane
          fileInput.multiple = false
        }
        fileInput.click()
      }
    })
  })
  
  // Handle file input changes
  const fileInputs = document.querySelectorAll('.file-input')
  fileInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      const planeName = (input as HTMLInputElement).getAttribute('data-plane')
      const files = (e.target as HTMLInputElement).files
      
      if (planeName && files && files.length > 0) {
        // Check if auto-detect is enabled and multiple files are selected
        if (autoDetectCheckbox && autoDetectCheckbox.checked && files.length > 1) {
          console.log(`Auto-detecting videos from ${files.length} files`)
          handleAutoDetectVideos(files)
        } else {
          // Single file handling (original behavior)
          const file = files[0]
          const textInput = document.querySelector(`.video-input[data-plane="${planeName}"]`) as HTMLInputElement
          if (textInput) {
            textInput.value = file.name // Show filename in text input
          }
          handleVideoRefreshFromFile(planeName, file)
        }
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

// Auto-detect and match videos from multiple files
async function handleAutoDetectVideos(files: FileList): Promise<void> {
  console.log('Auto-detecting videos from files:', Array.from(files).map(f => f.name))
  
  // Get the visualizer instance
  const visualizer = (window as any).visualizer
  if (!visualizer) {
    console.error('Visualizer not found')
    return
  }
  
  // Define the plane names we're looking for
  const targetPlanes = ['A7', 'BIG-MAP', 'ICE', 'A1', 'A2', 'K2', 'K4', 'Skeptrons', 'Stairs']
  
  // Create a map to store matched files
  const matchedFiles = new Map<string, File>()
  
  // Try to match files to plane names
  Array.from(files).forEach(file => {
    const fileName = file.name.toLowerCase()
    const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, '') // Remove file extension
    
    // Try exact matches first (case insensitive)
    for (const planeName of targetPlanes) {
      const lowerPlaneName = planeName.toLowerCase()
      
      // Check if filename matches plane name (with or without extension)
      if (nameWithoutExtension === lowerPlaneName || 
          fileName.startsWith(lowerPlaneName + '.') ||
          nameWithoutExtension.endsWith(lowerPlaneName)) {
        matchedFiles.set(planeName, file)
        console.log(`Matched ${file.name} -> ${planeName}`)
        break
      }
    }
  })
  
  // Apply matched files to their corresponding planes
  let successCount = 0
  let totalMatched = matchedFiles.size
  
  console.log(`Found ${totalMatched} matching video files`)
  
  for (const [planeName, file] of matchedFiles) {
    try {
      console.log(`Loading ${file.name} on ${planeName}...`)
      
      // Update the UI input field
      const textInput = document.querySelector(`.video-input[data-plane="${planeName}"]`) as HTMLInputElement
      if (textInput) {
        textInput.value = file.name
        textInput.style.borderColor = '#ffeaa7' // Yellow for loading
        textInput.style.backgroundColor = 'rgba(255, 234, 167, 0.1)'
      }
      
      // Load the video
      const success = await visualizer.getArena().loadVideoOnPlane(planeName, file)
      
      if (success) {
        successCount++
        // Update input styling to show success
        if (textInput) {
          textInput.style.borderColor = '#4ecdc4'
          textInput.style.backgroundColor = 'rgba(78, 205, 196, 0.1)'
        }
        console.log(`✓ Successfully loaded ${file.name} on ${planeName}`)
      } else {
        // Update input styling to show error
        if (textInput) {
          textInput.style.borderColor = '#ff6b6b'
          textInput.style.backgroundColor = 'rgba(255, 107, 107, 0.1)'
        }
        console.error(`✗ Failed to load ${file.name} on ${planeName}`)
      }
    } catch (error) {
      console.error(`Error loading ${file.name} on ${planeName}:`, error)
      const textInput = document.querySelector(`.video-input[data-plane="${planeName}"]`) as HTMLInputElement
      if (textInput) {
        textInput.style.borderColor = '#ff6b6b'
        textInput.style.backgroundColor = 'rgba(255, 107, 107, 0.1)'
      }
    }
  }
  
  // Show summary
  console.log(`Auto-detection complete: ${successCount}/${totalMatched} videos loaded successfully`)
  
  // Show notification to user (you could implement a proper toast notification system)
  if (totalMatched > 0) {
    const message = `Auto-detected ${successCount}/${totalMatched} videos`
    console.log(`🎬 ${message}`)
    
    // Optional: Show a temporary message in the UI
    showTemporaryMessage(message, successCount === totalMatched ? 'success' : 'warning')
  } else {
    console.log('⚠️ No matching video files found. Files should be named like: A7.webm, BIG-MAP.webm, ICE.webm, etc.')
    showTemporaryMessage('No matching video files found', 'warning')
  }
}

// Helper function to show temporary messages
function showTemporaryMessage(message: string, type: 'success' | 'warning' | 'error'): void {
  // Create a simple toast-like notification
  const toast = document.createElement('div')
  toast.textContent = message
  toast.style.cssText = `
    position: fixed;
    top: 50px;
    right: 50px;
    padding: 12px 20px;
    border-radius: 6px;
    color: white;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    z-index: 1000;
    transition: all 0.3s ease;
    pointer-events: none;
    ${type === 'success' ? 'background: rgba(78, 205, 196, 0.9); border: 1px solid #4ecdc4;' : ''}
    ${type === 'warning' ? 'background: rgba(255, 234, 167, 0.9); border: 1px solid #ffeaa7; color: #333;' : ''}
    ${type === 'error' ? 'background: rgba(255, 107, 107, 0.9); border: 1px solid #ff6b6b;' : ''}
  `
  
  document.body.appendChild(toast)
  
  // Fade in
  setTimeout(() => {
    toast.style.opacity = '1'
    toast.style.transform = 'translateY(0)'
  }, 10)
  
  // Fade out and remove
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateY(-20px)'
    setTimeout(() => {
      document.body.removeChild(toast)
    }, 300)
  }, 3000)
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
  
  // Add mode toggle functionality
  setupModeToggle()
  
  // Add model version control functionality
  setupModelVersionControl()
  
  // Sync UI with the model version loaded from localStorage
  // Delay slightly to ensure Arena is fully initialized
  setTimeout(() => {
    const syncModelVersionUI = () => {
      const modelVersionInput = document.getElementById('model-version') as HTMLInputElement
      if (modelVersionInput && visualizer) {
        const currentVersion = visualizer.getArena().getModelVersion()
        modelVersionInput.value = currentVersion.toString()
        console.log(`UI synced with model version from localStorage: ${currentVersion}`)
      }
    }
    syncModelVersionUI()
  }, 100)
  
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

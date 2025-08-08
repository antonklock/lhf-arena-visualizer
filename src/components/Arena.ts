import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Label2DManager } from './Label2DManager'

interface PlaneConfig {
  name: string
  width: number
  height: number
  color: number
}

export class Arena {
  private group: THREE.Group
  private time: number = 0
  private planes: THREE.Mesh[] = []
  private planeMap: Map<string, THREE.Mesh> = new Map()
  private videoElements: Map<string, HTMLVideoElement[]> = new Map() // Store arrays of video elements for multi-plane support
  private videoTextures: Map<string, THREE.VideoTexture[]> = new Map() // Store arrays of textures for multi-plane support
  private mode: '2d' | '3d' = '3d'
  private model3D: THREE.Group | null = null
  private model3DPlanes: Map<string, THREE.Mesh> = new Map()
  private a7Parts: THREE.Mesh[] = [] // Store all A7 parts separately
  private bigMapPlanes: THREE.Mesh[] = [] // Store A0, A6, A8, A9 for BIG-MAP videos
  private gltfLoader: GLTFLoader = new GLTFLoader()
  private currentModelVersion: number = 3
  private readonly MODEL_VERSION_STORAGE_KEY = 'arena-model-version'
  private label2DManager: Label2DManager | null = null
  
  // Store original materials for proper restoration
  private originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]> = new Map()

  // Plane configurations with exact ratios
  private planeConfigs: PlaneConfig[] = [
    { name: 'A7', width: 6240, height: 192, color: 0xff6b6b },
    { name: 'BIG-MAP', width: 3840, height: 552, color: 0x4ecdc4 },
    { name: 'ICE', width: 4000, height: 2000, color: 0x45b7d1 },
    { name: 'A1', width: 10512, height: 144, color: 0x96ceb4 },
    { name: 'A2', width: 10800, height: 144, color: 0xffeaa7 },
    { name: 'K2', width: 6976, height: 672, color: 0xdda0dd },
    { name: 'K4', width: 5280, height: 480, color: 0xfd79a8 },
    { name: 'Skeptrons', width: 512, height: 200, color: 0x00b894 },
    { name: 'Stairs', width: 48, height: 16, color: 0xe17055 },
    { name: 'A9', width: 3840, height: 552, color: 0x4ecdc4 } // Uses BIG-MAP texture
  ]

  constructor() {
    this.group = new THREE.Group()
    
    // Load model version from localStorage or use default
    this.loadModelVersionFromStorage()
    
    this.createPlanes()
    
    // Load 3D model immediately if starting in 3D mode
    if (this.mode === '3d') {
      this.load3DModel().then(() => {
        this.show3DMode()
      }).catch(error => {
        console.error('Failed to load initial 3D model:', error)
      })
    }
  }

  private createPlanes(): void {
    // Scale factor to make the largest plane reasonable size (about 15 units)
    const maxDimension = Math.max(...this.planeConfigs.map(p => Math.max(p.width, p.height)))
    const scaleFactor = 15 / maxDimension

    // Calculate positions for tighter arrangement
    const positions = this.calculateTightPositions(scaleFactor)

    this.planeConfigs.forEach((config, index) => {
      // Calculate scaled dimensions while preserving exact ratios
      const scaledWidth = config.width * scaleFactor
      const scaledHeight = config.height * scaleFactor

      // Ensure minimum visibility for very thin planes
      const minSize = 0.5 // Minimum dimension for visibility
      const visibleWidth = Math.max(scaledWidth, minSize)
      const visibleHeight = Math.max(scaledHeight, minSize)

      // Create plane geometry with minimum size enforced
      const geometry = new THREE.PlaneGeometry(visibleWidth, visibleHeight)
      
      // Create material with distinct color for each plane
      const material = new THREE.MeshPhongMaterial({ 
        color: config.color,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      })

      const plane = new THREE.Mesh(geometry, material)

      // Use calculated tight positions - ensure position exists
      const position = positions[index]
      if (position) {
        plane.position.set(
          position.x,
          0.1, // Fixed level for all planes
          position.z
        )
      } else {
        // Fallback position if calculation failed
        plane.position.set(
          (index % 3 - 1) * 5,
          0.1,
          Math.floor(index / 3) * 5
        )
        console.warn(`Using fallback position for plane ${config.name} at index ${index}`)
      }

      // Rotate to lay flat
      plane.rotation.x = -Math.PI / 2
      
      // Enable shadows
      plane.receiveShadow = true
      plane.castShadow = true

      // Store plane info in userData for identification
      plane.userData = {
        name: config.name,
        originalDimensions: `${config.width}x${config.height}`,
        ratio: (config.width / config.height).toFixed(2),
        scaledDimensions: `${scaledWidth.toFixed(1)}x${scaledHeight.toFixed(1)}`,
        visibleDimensions: `${visibleWidth.toFixed(1)}x${visibleHeight.toFixed(1)}`,
        originalOpacity: 0.8,
        originalColor: config.color
      }

      // Store reference and add to scene
      this.planes.push(plane)
      this.planeMap.set(config.name, plane)
      this.group.add(plane)

      // Log the plane information to console for reference
      console.log(`${config.name}: ${config.width}x${config.height} (ratio: ${(config.width / config.height).toFixed(2)}) - scaled: ${scaledWidth.toFixed(1)}x${scaledHeight.toFixed(1)} - visible: ${visibleWidth.toFixed(1)}x${visibleHeight.toFixed(1)}`)
    })

    // Add a subtle grid helper for reference
    const gridHelper = new THREE.GridHelper(60, 30, 0x444444, 0x222222)
    gridHelper.position.y = 0
    this.group.add(gridHelper)
    
    console.log('2D planes created, ready to initialize labels')
  }

  private calculateTightPositions(scaleFactor: number): Array<{x: number, z: number}> {
    // Calculate scaled dimensions for positioning
    const scaledDimensions = this.planeConfigs.map(config => ({
      width: config.width * scaleFactor,
      height: config.height * scaleFactor,
      name: config.name
    }))

    // Arrange in a 4x3 grid to accommodate 10 planes (with 2 empty slots)
    const positions: Array<{x: number, z: number}> = []
    const rows = 4
    const cols = 3
    
    // Calculate spacing based on largest dimensions in each row/column
    const rowMaxHeights = [0, 0, 0, 0]
    const colMaxWidths = [0, 0, 0]
    
    // Find max dimensions for each row and column
    scaledDimensions.forEach((dim, index) => {
      const row = Math.floor(index / cols)
      const col = index % cols
      
      if (row < rowMaxHeights.length) {
        rowMaxHeights[row] = Math.max(rowMaxHeights[row], dim.height)
      }
      if (col < colMaxWidths.length) {
        colMaxWidths[col] = Math.max(colMaxWidths[col], dim.width)
      }
    })
    
    // Calculate positions with tight spacing
    let currentZ = 0
    for (let row = 0; row < rows; row++) {
      let currentX = 0
      
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col
        if (index < this.planeConfigs.length) {
          positions.push({
            x: currentX - (colMaxWidths[0] + colMaxWidths[1] + colMaxWidths[2]) / 2 + colMaxWidths[col] / 2,
            z: currentZ - (rowMaxHeights[0] + rowMaxHeights[1] + rowMaxHeights[2] + rowMaxHeights[3]) / 2 + rowMaxHeights[row] / 2
          })
        }
        currentX += colMaxWidths[col] + 2 // Small gap between columns
      }
      
      currentZ += rowMaxHeights[row] + 2 // Small gap between rows
    }
    
    return positions
  }

  public highlightPlane(planeName: string): void {
    // Handle 2D planes
    this.planes.forEach(plane => {
      const material = plane.material as THREE.MeshPhongMaterial
      if (plane.userData.name === planeName) {
        // Highlight this plane
        material.opacity = 1.0
        material.emissive.setHex(0x222222) // Add glow effect
      } else {
        // Dim other planes
        material.opacity = 0.3
        material.emissive.setHex(0x000000) // Remove glow
      }
    })
    
    // Handle 3D planes by modifying current material properties
    if (this.model3D) {
      // Handle A7 specially - highlight all A7 parts and dim others
      if (planeName === 'A7' && this.a7Parts.length > 0) {
        this.a7Parts.forEach(part => {
          const currentMaterial = part.material as THREE.MeshPhongMaterial
          if (currentMaterial && currentMaterial.emissiveIntensity !== undefined) {
            // Boost emissive intensity for highlighting while preserving the material
            currentMaterial.emissiveIntensity = 1.0
            currentMaterial.opacity = 1.0
          }
        })
        
        // Dim all other planes (including BIG-MAP parts and regular planes)
        this.model3D.traverse((child) => {
          if (child instanceof THREE.Mesh && child.name && child.material) {
            // Skip A7 parts as they're already highlighted above
            if (!this.isSpecialPlane(child.name) || this.bigMapPlanes.includes(child)) {
              const currentMaterial = child.material as THREE.MeshPhongMaterial
              if (currentMaterial.emissiveIntensity !== undefined) {
                currentMaterial.emissiveIntensity = 0.1
              }
              if (currentMaterial.opacity !== undefined) {
                currentMaterial.opacity = Math.min(currentMaterial.opacity, 0.4)
              }
            }
          }
        })
      }
      
      // Handle BIG-MAP specially - highlight all BIG-MAP parts and dim others
      else if (planeName === 'BIG-MAP' && this.bigMapPlanes.length > 0) {
        this.bigMapPlanes.forEach(part => {
          const currentMaterial = part.material as THREE.MeshPhongMaterial
          if (currentMaterial && currentMaterial.emissiveIntensity !== undefined) {
            // Boost emissive intensity for highlighting while preserving the material
            currentMaterial.emissiveIntensity = 1.0
            currentMaterial.opacity = 1.0
          }
        })
        
        // Dim all other planes (including A7 parts and regular planes)
        this.model3D.traverse((child) => {
          if (child instanceof THREE.Mesh && child.name && child.material) {
            // Skip BIG-MAP parts as they're already highlighted above
            if (!this.bigMapPlanes.includes(child)) {
              const currentMaterial = child.material as THREE.MeshPhongMaterial
              if (currentMaterial.emissiveIntensity !== undefined) {
                currentMaterial.emissiveIntensity = 0.1
              }
              if (currentMaterial.opacity !== undefined) {
                currentMaterial.opacity = Math.min(currentMaterial.opacity, 0.4)
              }
            }
          }
        })
      }
      
      // Handle other 3D planes
      else {
        this.model3D.traverse((child) => {
          if (child instanceof THREE.Mesh && child.name && child.material) {
            const currentMaterial = child.material as THREE.MeshPhongMaterial
            
            if (child.name === planeName) {
              // Highlight this plane by boosting emissive intensity
              if (currentMaterial.emissiveIntensity !== undefined) {
                currentMaterial.emissiveIntensity = 1.0
                currentMaterial.opacity = 1.0
              }
            } else {
              // Dim other planes by reducing emissive intensity and opacity
              if (currentMaterial.emissiveIntensity !== undefined) {
                currentMaterial.emissiveIntensity = 0.1
              }
              if (currentMaterial.opacity !== undefined) {
                currentMaterial.opacity = Math.min(currentMaterial.opacity, 0.4)
              }
            }
          }
        })
      }
    }
  }

  public resetHighlight(): void {
    // Reset 2D planes
    this.planes.forEach(plane => {
      const material = plane.material as THREE.MeshPhongMaterial
      material.opacity = plane.userData.originalOpacity || 0.8
      material.emissive.setHex(0x000000) // Remove glow
    })
    
    // Reset 3D planes by restoring normal emissive properties while preserving materials
    if (this.model3D) {
      this.model3D.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const currentMaterial = child.material as THREE.MeshPhongMaterial
          
          // Reset emissive intensity to normal level
          if (currentMaterial.emissiveIntensity !== undefined) {
            // For video materials, restore to normal video emissive intensity (0.9)
            // For non-video materials, restore to 0
            if (currentMaterial.map && currentMaterial.emissiveMap) {
              // This is likely a video material
              currentMaterial.emissiveIntensity = 0.9
              currentMaterial.opacity = 0.9
            } else {
              // This is likely a non-video material
              currentMaterial.emissiveIntensity = 0.0
              currentMaterial.opacity = 1.0
            }
          }
        }
      })
    }
  }

  public update(deltaTime: number): void {
    this.time += deltaTime
    // Remove the pulsing animation to avoid interfering with highlight system
  }
  
  // Helper method to check if a mesh is part of special multi-part planes
  private isSpecialPlane(meshName: string): boolean {
    if (!meshName) return false
    
    // Check if it's an A7 part
    if (/^A7[0-9]+$/.test(meshName)) return true
    
    // Check if it's a BIG-MAP part
    if (meshName === 'A0' || meshName === 'A6' || meshName === 'A8' || meshName === 'A9') return true
    
    return false
  }


  // Helper method to clear material from a specific plane without affecting video resources
  private clearMaterialFromSpecificPlane(plane: THREE.Mesh, planeName: string): void {
    // Determine original color based on plane name
    let originalColor = 0x808080 // Default gray
    const planeConfig = this.planeConfigs.find(config => config.name === planeName)
    if (planeConfig) {
      originalColor = planeConfig.color
    }
    
    // Special handling for A7 and BIG-MAP planes
    if (planeName === 'A7') {
      originalColor = 0xff6b6b // A7 color
    } else if (planeName === 'BIG-MAP') {
      originalColor = 0x4ecdc4 // BIG-MAP color
    }
    
    // Create new material and apply it
    const shouldCullBackfaces = planeName === 'A7' || planeName === 'BIG-MAP'
    plane.material = new THREE.MeshPhongMaterial({
      color: originalColor,
      transparent: false,
      side: shouldCullBackfaces ? THREE.FrontSide : THREE.DoubleSide
    })
  }

  public clearVideoFromPlane(planeName: string): void {
    // Handle 2D plane
    const plane = this.planeMap.get(planeName)
    if (plane) {
      // Get original color from userData
      const originalColor = plane.userData.originalColor

      // Restore original material
      const originalMaterial = new THREE.MeshPhongMaterial({
        color: originalColor,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      })

      plane.material = originalMaterial
    }

    // Handle A7 specially - clear from all A7 parts
    if (planeName === 'A7' && this.a7Parts.length > 0) {
      console.log(`Clearing video from all ${this.a7Parts.length} A7 parts`)
      for (const a7Part of this.a7Parts) {
        a7Part.material = new THREE.MeshPhongMaterial({
          color: 0xff6b6b, // A7 color
          transparent: false,
          side: THREE.FrontSide // Cull backfaces
        })
      }
    }
    // Handle BIG-MAP specially - clear from all BIG-MAP parts (A0, A6, A8, A9)
    else if (planeName === 'BIG-MAP' && this.bigMapPlanes.length > 0) {
      console.log(`Clearing BIG-MAP video from all ${this.bigMapPlanes.length} BIG-MAP parts`)
      for (const bigMapPart of this.bigMapPlanes) {
        bigMapPart.material = new THREE.MeshPhongMaterial({
          color: 0x4ecdc4, // BIG-MAP color
          transparent: false,
          side: THREE.FrontSide // Cull backfaces
        })
      }
    }
    // Handle other 3D planes normally
    else {
      const plane3D = this.model3DPlanes.get(planeName)
      if (plane3D) {
        // Determine original color based on plane name
        let originalColor = 0x808080 // Default gray
        const planeConfig = this.planeConfigs.find(config => config.name === planeName)
        if (planeConfig) {
          originalColor = planeConfig.color
        }
        
        plane3D.material = new THREE.MeshPhongMaterial({
          color: originalColor,
          transparent: false,
          side: THREE.DoubleSide
        })
      }
    }

    // Clean up video resources
    const videos = this.videoElements.get(planeName)
    if (videos) {
      videos.forEach(video => {
        video.pause()
        
        // Clean up object URL if it exists
        if (video.dataset.objectUrl) {
          URL.revokeObjectURL(video.dataset.objectUrl)
          delete video.dataset.objectUrl
        }
        
        video.src = ''
        video.load() // This helps free up memory
      })
      this.videoElements.delete(planeName)
    }

    const textures = this.videoTextures.get(planeName)
    if (textures) {
      textures.forEach(texture => texture.dispose())
      this.videoTextures.delete(planeName)
    }

    console.log(`Video cleared from plane: ${planeName}`)
  }

  public isVideoLoadedOnPlane(planeName: string): boolean {
    return this.videoElements.has(planeName)
  }

  public getPlaneNames(): string[] {
    return Array.from(this.planeMap.keys())
  }

  // Timeline control methods
  public playAllVideos(): void {
    this.videoElements.forEach((videos, planeName) => {
      videos.forEach((video, index) => {
        try {
          // Only try to play if the video is paused and has a valid source
          if (video.paused && video.src && !video.src.includes('blob:')) {
            video.play()
            console.log(`Playing video on plane: ${planeName} (part ${index + 1})`)
          } else if (video.paused && video.src && video.src.includes('blob:')) {
            // For blob URLs, check if the object URL is still valid
            if (video.dataset.objectUrl) {
              video.play()
              console.log(`Playing blob video on plane: ${planeName} (part ${index + 1})`)
            } else {
              console.warn(`Blob URL invalid for video on plane: ${planeName} (part ${index + 1})`)
            }
          } else if (!video.paused) {
            console.log(`Video already playing on plane: ${planeName} (part ${index + 1})`)
          } else {
            console.warn(`No valid source for video on plane: ${planeName} (part ${index + 1})`, { src: video.src, readyState: video.readyState })
          }
        } catch (error) {
          console.warn(`Failed to play video on plane ${planeName} (part ${index + 1}):`, error)
        }
      })
    })
  }

  public pauseAllVideos(): void {
    this.videoElements.forEach((videos, planeName) => {
      videos.forEach((video, index) => {
        try {
          video.pause()
          console.log(`Paused video on plane: ${planeName} (part ${index + 1})`)
        } catch (error) {
          console.warn(`Failed to pause video on plane ${planeName} (part ${index + 1}):`, error)
        }
      })
    })
  }

  public stopAndRewindAllVideos(): void {
    this.videoElements.forEach((videos, planeName) => {
      videos.forEach((video, index) => {
        try {
          video.pause()
          video.currentTime = 0
          console.log(`Stopped and rewound video on plane: ${planeName} (part ${index + 1})`)
        } catch (error) {
          console.warn(`Failed to stop video on plane ${planeName} (part ${index + 1}):`, error)
        }
      })
    })
  }

  public seekAllVideos(percentage: number): void {
    this.videoElements.forEach((videos, planeName) => {
      videos.forEach((video, index) => {
        try {
          if (video.duration && !isNaN(video.duration)) {
            video.currentTime = (percentage / 100) * video.duration
          }
        } catch (error) {
          console.warn(`Failed to seek video on plane ${planeName} (part ${index + 1}):`, error)
        }
      })
    })
  }

  public getVideoPlaybackInfo(): { currentTime: number; duration: number; isPlaying: boolean; videoCount: number } {
    const allVideoArrays = Array.from(this.videoElements.values())
    const allVideos = allVideoArrays.flat()
    
    if (allVideos.length === 0) {
      return { currentTime: 0, duration: 0, isPlaying: false, videoCount: 0 }
    }

    // Use the first video as reference for timing
    const referenceVideo = allVideos[0]
    const currentTime = referenceVideo.currentTime || 0
    const duration = referenceVideo.duration || 0
    const isPlaying = !referenceVideo.paused && !referenceVideo.ended

    return {
      currentTime,
      duration,
      isPlaying,
      videoCount: this.videoElements.size // Count unique plane names, not individual video elements
    }
  }

  public getLoadedVideoCount(): number {
    return this.videoElements.size
  }

  // Audio control methods
  public togglePlaneAudio(planeName: string): boolean {
    const videos = this.videoElements.get(planeName)
    if (!videos || videos.length === 0) {
      console.warn(`No videos found for plane: ${planeName}`)
      return false
    }

    // Toggle muted state for all videos on this plane
    const newMutedState = !videos[0].muted
    videos.forEach((video, index) => {
      video.muted = newMutedState
      console.log(`${newMutedState ? 'Muted' : 'Unmuted'} video on plane: ${planeName} (part ${index + 1})`)
    })

    return newMutedState
  }

  public isPlaneAudioMuted(planeName: string): boolean {
    const videos = this.videoElements.get(planeName)
    if (!videos || videos.length === 0) {
      return true // If no videos, consider it "muted"
    }
    return videos[0].muted
  }

  public setPlaneAudio(planeName: string, muted: boolean): void {
    const videos = this.videoElements.get(planeName)
    if (!videos || videos.length === 0) {
      console.warn(`No videos found for plane: ${planeName}`)
      return
    }

    videos.forEach((video, index) => {
      video.muted = muted
      console.log(`${muted ? 'Muted' : 'Unmuted'} video on plane: ${planeName} (part ${index + 1})`)
    })
  }

  public toggleGlobalAudio(): boolean {
    let newGlobalMutedState = false
    const allVideoArrays = Array.from(this.videoElements.values())
    const allVideos = allVideoArrays.flat()
    
    if (allVideos.length === 0) {
      return false
    }

    // Check current state - if any video is unmuted, we'll mute all
    // If all are muted, we'll unmute all
    const hasUnmutedVideos = allVideos.some(video => !video.muted)
    newGlobalMutedState = hasUnmutedVideos

    // Apply the new state to all videos
    this.videoElements.forEach((videos, planeName) => {
      videos.forEach((video, index) => {
        video.muted = newGlobalMutedState
        console.log(`Global ${newGlobalMutedState ? 'muted' : 'unmuted'} video on plane: ${planeName} (part ${index + 1})`)
      })
    })

    return newGlobalMutedState
  }

  public setGlobalVolume(volume: number): void {
    // Clamp volume between 0 and 1
    const clampedVolume = Math.max(0, Math.min(1, volume))
    
    this.videoElements.forEach((videos, planeName) => {
      videos.forEach((video, index) => {
        // Only adjust volume for unmuted videos
        if (!video.muted) {
          video.volume = clampedVolume
          console.log(`Set volume to ${Math.round(clampedVolume * 100)}% for video on plane: ${planeName} (part ${index + 1})`)
        }
      })
    })
  }

  public getGroup(): THREE.Group {
    return this.group
  }

  // 2D Label management methods
  public initialize2DLabels(scene: THREE.Scene): void {
    if (!this.label2DManager) {
      this.label2DManager = new Label2DManager(scene)
      this.label2DManager.createLabelsForPlanes(this.planeMap)
      // Initially hide labels (they'll be shown when switching to 2D mode)
      this.label2DManager.setVisible(false)
      console.log('2D labels initialized')
    }
  }

  public set2DCamera(camera: THREE.OrthographicCamera): void {
    if (this.label2DManager) {
      this.label2DManager.setCamera2D(camera)
    }
  }

  public update2DLabelScales(): void {
    if (this.label2DManager) {
      this.label2DManager.updateLabelScales()
    }
  }

  public set2DLabelsVisible(visible: boolean): void {
    if (this.label2DManager) {
      this.label2DManager.setVisible(visible)
    }
  }

  // Mode switching methods
  public async setMode(mode: '2d' | '3d'): Promise<void> {
    if (this.mode === mode) return

    this.mode = mode
    console.log(`Switching to ${mode} mode`)

    if (mode === '3d') {
      await this.load3DModel()
      this.show3DMode()
    } else {
      this.show2DMode()
    }
  }

  public getMode(): '2d' | '3d' {
    return this.mode
  }

  // Model version switching methods
  public async setModelVersion(version: number): Promise<void> {
    if (this.currentModelVersion === version) return
    
    console.log(`Switching from model version ${this.currentModelVersion} to ${version}`)
    this.currentModelVersion = version
    
    // Save to localStorage
    this.saveModelVersionToStorage()
    
    // Clear existing 3D model
    if (this.model3D) {
      this.group.remove(this.model3D)
      this.model3D = null
      this.model3DPlanes.clear()
      this.a7Parts = [] // Clear A7 parts array
      this.bigMapPlanes = [] // Clear BIG-MAP parts array
      this.originalMaterials.clear() // Clear stored materials
    }
    
    // Reload 3D model if we're in 3D mode
    if (this.mode === '3d') {
      await this.load3DModel()
      this.show3DMode()
    }
  }
  
  public getModelVersion(): number {
    return this.currentModelVersion
  }

  // localStorage methods for model version persistence
  private loadModelVersionFromStorage(): void {
    try {
      const storedVersion = localStorage.getItem(this.MODEL_VERSION_STORAGE_KEY)
      if (storedVersion !== null) {
        const version = parseInt(storedVersion, 10)
        if (!isNaN(version) && version > 0) {
          this.currentModelVersion = version
          console.log(`Loaded model version ${version} from localStorage`)
        } else {
          console.warn(`Invalid model version in localStorage: ${storedVersion}. Using default: ${this.currentModelVersion}`)
        }
      } else {
        console.log(`No model version found in localStorage. Using default: ${this.currentModelVersion}`)
      }
    } catch (error) {
      console.error('Failed to load model version from localStorage:', error)
      console.log(`Using default model version: ${this.currentModelVersion}`)
    }
  }

  private saveModelVersionToStorage(): void {
    try {
      localStorage.setItem(this.MODEL_VERSION_STORAGE_KEY, this.currentModelVersion.toString())
      console.log(`Saved model version ${this.currentModelVersion} to localStorage`)
    } catch (error) {
      console.error('Failed to save model version to localStorage:', error)
    }
  }

  private async load3DModel(): Promise<void> {
    if (this.model3D) {
      console.log('3D model already loaded')
      return
    }

    try {
      console.log('Loading 3D model...')
      const gltf = await this.gltfLoader.loadAsync(`/models/LHF_ARENA_WEB_EXPORT_${this.currentModelVersion.toString().padStart(2, '0')}.glb`)
      this.model3D = gltf.scene
      
      // Scale the model if needed
      this.model3D.scale.setScalar(1)
      
      // Position the model
      this.model3D.position.set(0, 0, 0)
      
      // Enable shadows and handle special materials on the model
      const allMeshNames: string[] = []
      this.model3D.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true
          child.receiveShadow = true
          
          allMeshNames.push(child.name || 'UNNAMED')
          console.log(`Found mesh: "${child.name}" (type: ${typeof child.name})`)
          
          // Store the original material first for ALL meshes
          this.originalMaterials.set(child, child.material)
          
          // Handle inner parts (should be black)
          if (child.name === 'K2 inner' || child.name === 'K4 inner') {
            console.log(`Setting ${child.name} to black material`)
            const newMaterial = new THREE.MeshPhongMaterial({
              color: 0x000000, // Black
              transparent: false,
              side: THREE.DoubleSide
            })
            child.material = newMaterial
            this.originalMaterials.set(child, newMaterial)
          }
          
          // Handle parts that should be black until proper UV mapping is implemented
          else if (child.name === 'Skeptrons' || child.name === 'Skeptrons_Inside' || 
              child.name === 'Skeptrons_Outside') {
            console.log(`Setting ${child.name} to black material (temporary until UV mapping)`)
            const newMaterial = new THREE.MeshPhongMaterial({
              color: 0x000000, // Black
              transparent: false,
              side: THREE.DoubleSide
            })
            child.material = newMaterial
            this.originalMaterials.set(child, newMaterial)
          }
          
          // Store the original material before making any changes
          this.originalMaterials.set(child, child.material)
          
          // Handle A7 parts - set material and collect all parts
          if (child.name && /^A7[0-9]+$/.test(child.name)) {
            console.log(`Setting up ${child.name} with A7 material`)
            const newMaterial = new THREE.MeshPhongMaterial({
              color: 0xff6b6b, // A7 color
              transparent: false,
              side: THREE.FrontSide // Cull backfaces
            })
            child.material = newMaterial
            // Update the stored original material to be this new one
            this.originalMaterials.set(child, newMaterial)
            // Store all A7 parts in separate array
            this.a7Parts.push(child)
            console.log(`Added A7 part: ${child.name}`)
          }
          
          // Handle BIG-MAP planes (A0, A6, A8, A9) - set material and collect all parts
          else if (child.name === 'A0' || child.name === 'A6' || child.name === 'A8' || child.name === 'A9') {
            console.log(`Setting up ${child.name} with BIG-MAP material`)
            const newMaterial = new THREE.MeshPhongMaterial({
              color: 0x4ecdc4, // BIG-MAP color
              transparent: false,
              side: THREE.FrontSide // Cull backfaces
            })
            child.material = newMaterial
            // Update the stored original material to be this new one
            this.originalMaterials.set(child, newMaterial)
            // Store all BIG-MAP planes in separate array
            this.bigMapPlanes.push(child)
            // Also register individually for potential future use
            this.model3DPlanes.set(child.name, child)
            console.log(`Added BIG-MAP plane: ${child.name}`)
          }
          
          // Handle ceiling (should be almost white)
          else if (child.name && (child.name.toLowerCase().includes('ceiling') || 
                            child.name.toLowerCase().includes('roof') ||
                            child.name.toLowerCase().includes('top'))) {
            console.log(`Setting ${child.name} to almost white material`)
            const newMaterial = new THREE.MeshPhongMaterial({
              color: 0xf0f0f0, // Almost white (240, 240, 240)
              transparent: false,
              side: THREE.DoubleSide
            })
            child.material = newMaterial
            this.originalMaterials.set(child, newMaterial)
          }
          
          // Store reference to planes based on their name
          if (child.name && this.planeConfigs.some(config => config.name === child.name)) {
            this.model3DPlanes.set(child.name, child)
            console.log(`Found 3D plane: ${child.name}`)
          }
          
          // Also check for exact name matches with K2/K4 (not inner)
          if (child.name === 'K2' || child.name === 'K4') {
            this.model3DPlanes.set(child.name, child)
            console.log(`Found 3D plane: ${child.name}`)
          }
        }
      })
      
      // Register the first A7 part as representative for the A7 plane config
      if (this.a7Parts.length > 0) {
        this.model3DPlanes.set('A7', this.a7Parts[0])
        console.log(`Registered A7 plane with ${this.a7Parts.length} parts`)
      }
      
      // Add to group but initially hidden
      this.model3D.visible = false
      this.group.add(this.model3D)
      
      console.log('3D model loaded successfully')
      console.log('Model bounding box:', {
        position: this.model3D.position,
        scale: this.model3D.scale,
        children: this.model3D.children.length
      })
      console.log('Found 3D planes:', Array.from(this.model3DPlanes.keys()))
      console.log('ALL MODEL MESH NAMES:', allMeshNames)
      console.log('A7 PARTS FOUND:', this.a7Parts.length)
      console.log('A7 PART NAMES:', this.a7Parts.map(part => part.name))
      console.log('BIG-MAP PARTS FOUND:', this.bigMapPlanes.length)
      console.log('BIG-MAP PART NAMES:', this.bigMapPlanes.map(part => part.name))
      
      // Calculate and log bounding box
      const box = new THREE.Box3().setFromObject(this.model3D)
      console.log('Model bounding box size:', {
        min: box.min,
        max: box.max,
        size: box.getSize(new THREE.Vector3())
      })
      
    } catch (error) {
      console.error('Failed to load 3D model:', error)
      throw error
    }
  }

  private show2DMode(): void {
    // Show 2D planes
    this.planes.forEach(plane => {
      plane.visible = true
    })
    
    // Hide 3D model
    if (this.model3D) {
      this.model3D.visible = false
    }
    
    // Show 2D labels
    this.set2DLabelsVisible(true)
    
    console.log('Switched to 2D mode')
  }

  private show3DMode(): void {
    // Hide 2D planes
    this.planes.forEach(plane => {
      plane.visible = false
    })
    
    // Show 3D model
    if (this.model3D) {
      this.model3D.visible = true
    }
    
    // Hide 2D labels
    this.set2DLabelsVisible(false)
    
    console.log('Switched to 3D mode')
  }

  // Override loadVideoOnPlane to work with both modes
  public async loadVideoOnPlane(planeName: string, videoSource: string | File): Promise<boolean> {
    // Clear any existing video for this plane first
    this.clearVideoFromPlane(planeName)
    
    // Create a single video element for this plane
    const video = document.createElement('video')
    video.loop = true
    video.muted = true // Required for autoplay
    video.playsInline = true
    video.preload = 'metadata'

    // Handle File objects vs URLs differently
    if (videoSource instanceof File) {
      const objectUrl = URL.createObjectURL(videoSource)
      video.src = objectUrl
      video.dataset.objectUrl = objectUrl
    } else {
      video.crossOrigin = 'anonymous'
      video.src = videoSource
    }

    // Set up video loading promise
    const loadPromise = new Promise<boolean>((resolve) => {
      const onLoadedMetadata = () => {
        video.removeEventListener('loadedmetadata', onLoadedMetadata)
        video.removeEventListener('error', onError)
        resolve(true)
      }

      const onError = (event: Event) => {
        video.removeEventListener('loadedmetadata', onLoadedMetadata)
        video.removeEventListener('error', onError)
        console.error(`Failed to load video:`, videoSource, event)
        resolve(false)
      }

      video.addEventListener('loadedmetadata', onLoadedMetadata)
      video.addEventListener('error', onError)
      video.load()
    })

    const loaded = await loadPromise
    if (!loaded) {
      return false
    }

    // Create a single video texture that will be shared
    const videoTexture = new THREE.VideoTexture(video)
    videoTexture.minFilter = THREE.LinearFilter
    videoTexture.magFilter = THREE.LinearFilter
    videoTexture.flipY = false

    // Apply UV mapping based on plane config
    this.applyUVMapping(videoTexture, planeName, video)
    
    // Set texture properties
    videoTexture.wrapS = THREE.ClampToEdgeWrap
    videoTexture.wrapT = THREE.ClampToEdgeWrap
    videoTexture.generateMipmaps = false
    videoTexture.needsUpdate = true

    // Apply the shared texture to all relevant planes
    let success = false
    
    // Apply to 2D plane if it exists
    const plane2D = this.planeMap.get(planeName)
    if (plane2D) {
      this.applyVideoMaterialToPlane(plane2D, videoTexture, planeName)
      success = true
    }
    
    // Apply to 3D planes
    if (planeName === 'A7' && this.a7Parts.length > 0) {
      console.log(`Applying shared video texture to all ${this.a7Parts.length} A7 parts`)
      this.a7Parts.forEach(part => {
        this.applyVideoMaterialToPlane(part, videoTexture, planeName)
      })
      success = true
    } else if (planeName === 'BIG-MAP' && this.bigMapPlanes.length > 0) {
      console.log(`Applying shared video texture to all ${this.bigMapPlanes.length} BIG-MAP parts`)
      this.bigMapPlanes.forEach(part => {
        this.applyVideoMaterialToPlane(part, videoTexture, planeName)
      })
      success = true
    } else {
      const plane3D = this.model3DPlanes.get(planeName)
      if (plane3D) {
        this.applyVideoMaterialToPlane(plane3D, videoTexture, planeName)
        success = true
      }
    }
    
    if (success) {
      // Store single video element and texture
      this.videoElements.set(planeName, [video])
      this.videoTextures.set(planeName, [videoTexture])
      
      console.log(`Video loaded and applied to ${planeName}`, {
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        currentTime: video.currentTime,
        paused: video.paused,
        readyState: video.readyState
      })
    }
    
    return success
  }

  // Helper method to apply UV mapping to a video texture
  private applyUVMapping(videoTexture: THREE.VideoTexture, planeName: string, video: HTMLVideoElement): void {
    const planeConfig = this.planeConfigs.find(config => config.name === planeName)
    
    if (planeConfig) {
      const originalWidth = planeConfig.width
      const originalHeight = planeConfig.height
      const originalAspectRatio = originalWidth / originalHeight
      
      // Get actual video aspect ratio from the video element
      const videoAspectRatio = video.videoWidth / video.videoHeight
      
      console.log(`UV Mapping for ${planeName}: Original ${originalAspectRatio.toFixed(2)}:1, Video ${videoAspectRatio.toFixed(2)}:1`)
      
      // Apply UV mapping if the video aspect ratio is significantly different from original
      if (Math.abs(videoAspectRatio - originalAspectRatio) > 0.1) {
        if (videoAspectRatio < originalAspectRatio) {
          // Video is taller than needed - crop vertically (show horizontal slice)
          const heightScale = videoAspectRatio / originalAspectRatio
          const heightOffset = (1 - heightScale) / 2
          
          // For very extreme ratios, use a larger minimum scale to ensure visibility
          let minScale = 0.001
          if (planeName === 'A7' || planeName === 'A1' || planeName === 'A2') {
            minScale = 0.1 // Very extreme ratios
          } else if (planeName === 'K2' || planeName === 'K4') {
            minScale = 0.05 // K2/K4 need better visibility than default
          }
          
          const actualScale = Math.max(minScale, heightScale)
          const actualOffset = actualScale === minScale ? (1 - actualScale) / 2 : heightOffset
          
          console.log(`Vertical crop for ${planeName}: original scale=${heightScale.toFixed(3)}, actual scale=${actualScale.toFixed(3)}, offset=${actualOffset.toFixed(3)}`)
          
          videoTexture.repeat.set(1, actualScale)
          videoTexture.offset.set(0, actualOffset)
        } else {
          // Video is wider than needed - crop horizontally (show vertical slice)
          const widthScale = originalAspectRatio / videoAspectRatio
          const widthOffset = (1 - widthScale) / 2
          
          console.log(`Horizontal crop for ${planeName}: scale=${widthScale.toFixed(3)}, offset=${widthOffset.toFixed(3)}`)
          
          videoTexture.repeat.set(Math.max(0.001, widthScale), 1) // Prevent zero scale
          videoTexture.offset.set(widthOffset, 0)
        }
      } else {
        // Aspect ratios are similar, use full texture
        console.log(`No UV mapping needed for ${planeName}`)
        videoTexture.repeat.set(1, 1)
        videoTexture.offset.set(0, 0)
      }
    } else {
      // Fallback: use full texture if no config found
      console.log(`No plane config found for ${planeName}, using full texture`)
      videoTexture.repeat.set(1, 1)
      videoTexture.offset.set(0, 0)
    }
  }

  // Helper method to apply video material to a specific plane
  private applyVideoMaterialToPlane(plane: THREE.Mesh, videoTexture: THREE.VideoTexture, planeName: string): void {
    const shouldCullBackfaces = planeName === 'A7' || planeName === 'BIG-MAP'
    const videoMaterial = new THREE.MeshPhongMaterial({
      map: videoTexture,
      emissiveMap: videoTexture,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.9,
      side: shouldCullBackfaces ? THREE.FrontSide : THREE.DoubleSide
    })

    plane.material = videoMaterial
  }

  private async loadVideoOnSpecificPlane(plane: THREE.Mesh, planeName: string, videoSource: string | File, skipClear: boolean = false): Promise<boolean> {
    try {
      // Clean up existing video if any (unless specifically skipped)
      if (!skipClear) {
        // For 3D planes, only clear the specific plane material, not all video resources
        const is3DPlane = this.model3DPlanes.has(planeName) || this.a7Parts.includes(plane) || this.bigMapPlanes.includes(plane)
        if (is3DPlane) {
          // Just clear the material on this specific plane, don't call full clearVideoFromPlane
          this.clearMaterialFromSpecificPlane(plane, planeName)
        } else {
          // For 2D planes, use the full clear method
          this.clearVideoFromPlane(planeName)
        }
      }

      // Create video element
      const video = document.createElement('video')
      video.loop = true
      video.muted = true // Required for autoplay
      video.playsInline = true
      video.preload = 'metadata'

      // Handle File objects vs URLs differently
      if (videoSource instanceof File) {
        // For File objects, we don't need crossOrigin
        const objectUrl = URL.createObjectURL(videoSource)
        video.src = objectUrl
        
        // Store object URL for cleanup
        video.dataset.objectUrl = objectUrl
      } else {
        // For URLs, set crossOrigin
        video.crossOrigin = 'anonymous'
        video.src = videoSource
      }

      // Set up video loading promise - wait for loadedmetadata to ensure we have video dimensions
      const loadPromise = new Promise<boolean>((resolve) => {
        const onLoadedMetadata = () => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata)
          video.removeEventListener('error', onError)
          resolve(true)
        }

        const onError = (event: Event) => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata)
          video.removeEventListener('error', onError)
          console.error(`Failed to load video:`, videoSource, event)
          resolve(false)
        }

        video.addEventListener('loadedmetadata', onLoadedMetadata)
        video.addEventListener('error', onError)
        
        // Load the video
        video.load()
      })

      const loaded = await loadPromise
      if (!loaded) {
        return false
      }

      // Create video texture
      const videoTexture = new THREE.VideoTexture(video)
      videoTexture.minFilter = THREE.LinearFilter
      videoTexture.magFilter = THREE.LinearFilter
      videoTexture.flipY = false

      // Apply UV mapping based on plane type and video dimensions
      const is3DPlane = this.model3DPlanes.has(planeName)
      
      // Get original dimensions from plane config for consistent UV mapping
      const planeConfig = this.planeConfigs.find(config => config.name === planeName)
      
      if (planeConfig) {
        const originalWidth = planeConfig.width
        const originalHeight = planeConfig.height
        const originalAspectRatio = originalWidth / originalHeight
        
        // Get actual video aspect ratio from the video element
        const videoAspectRatio = video.videoWidth / video.videoHeight
        
        console.log(`UV Mapping for ${planeName} (${is3DPlane ? '3D' : '2D'}): Original ${originalAspectRatio.toFixed(2)}:1, Video ${videoAspectRatio.toFixed(2)}:1`)
        
        // Apply UV mapping if the video aspect ratio is significantly different from original
        if (Math.abs(videoAspectRatio - originalAspectRatio) > 0.1) {
          if (videoAspectRatio < originalAspectRatio) {
            // Video is taller than needed - crop vertically (show horizontal slice)
            const heightScale = videoAspectRatio / originalAspectRatio
            const heightOffset = (1 - heightScale) / 2
            
            // For very extreme ratios, use a larger minimum scale to ensure visibility
            let minScale = 0.001
            if (planeName === 'A7' || planeName === 'A1' || planeName === 'A2') {
              minScale = 0.1 // Very extreme ratios
            } else if (planeName === 'K2' || planeName === 'K4') {
              minScale = 0.05 // K2/K4 need better visibility than default
            }
            
            const actualScale = Math.max(minScale, heightScale)
            const actualOffset = actualScale === minScale ? (1 - actualScale) / 2 : heightOffset
            
            console.log(`Vertical crop for ${planeName}: original scale=${heightScale.toFixed(3)}, actual scale=${actualScale.toFixed(3)}, offset=${actualOffset.toFixed(3)}`)
            
            videoTexture.repeat.set(1, actualScale)
            videoTexture.offset.set(0, actualOffset)
          } else {
            // Video is wider than needed - crop horizontally (show vertical slice)
            const widthScale = originalAspectRatio / videoAspectRatio
            const widthOffset = (1 - widthScale) / 2
            
            console.log(`Horizontal crop for ${planeName}: scale=${widthScale.toFixed(3)}, offset=${widthOffset.toFixed(3)}`)
            
            videoTexture.repeat.set(Math.max(0.001, widthScale), 1) // Prevent zero scale
            videoTexture.offset.set(widthOffset, 0)
          }
        } else {
          // Aspect ratios are similar, use full texture
          console.log(`No UV mapping needed for ${planeName}`)
          videoTexture.repeat.set(1, 1)
          videoTexture.offset.set(0, 0)
        }
      } else {
        // Fallback: use full texture if no config found
        console.log(`No plane config found for ${planeName}, using full texture`)
        videoTexture.repeat.set(1, 1)
        videoTexture.offset.set(0, 0)
      }
      
      // Set proper texture wrapping and parameters to avoid WebGL warnings
      videoTexture.wrapS = THREE.ClampToEdgeWrap
      videoTexture.wrapT = THREE.ClampToEdgeWrap
      videoTexture.generateMipmaps = false
      videoTexture.needsUpdate = true

      // Create new material with video texture (emissive for visibility)
      // Use FrontSide for A7 and BIG-MAP planes to cull backfaces
      const shouldCullBackfaces = planeName === 'A7' || planeName === 'BIG-MAP'
      const videoMaterial = new THREE.MeshPhongMaterial({
        map: videoTexture,
        emissiveMap: videoTexture,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.9,
        transparent: true,
        opacity: 0.9,
        side: shouldCullBackfaces ? THREE.FrontSide : THREE.DoubleSide
      })

      // Apply the video material to the plane
      plane.material = videoMaterial
      
      console.log(`Applied video to ${planeName} (${is3DPlane ? '3D' : '2D'} plane)`)

      // Store references for video playback control
      // For A7 parts, we want to store the video with the 'A7' key so timeline controls work
      // For BIG-MAP loading onto multiple parts, we want to use 'BIG-MAP' as the key
      const storageKey = planeName === 'BIG-MAP' ? 'BIG-MAP' : planeName
      
      // Initialize arrays if they don't exist
      if (!this.videoElements.has(storageKey)) {
        this.videoElements.set(storageKey, [])
        this.videoTextures.set(storageKey, [])
      }
      
      // Add both video element and texture to their respective arrays
      const videoArray = this.videoElements.get(storageKey)!
      const textureArray = this.videoTextures.get(storageKey)!
      videoArray.push(video)
      textureArray.push(videoTexture)

      // Video loaded successfully - keep it paused until user explicitly plays
      console.log(`Video loaded and ready on plane: ${planeName}`, {
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        currentTime: video.currentTime,
        paused: video.paused,
        readyState: video.readyState
      })

      return true
    } catch (error) {
      console.error(`Error loading video on plane ${planeName}:`, error)
      return false
    }
  }
}

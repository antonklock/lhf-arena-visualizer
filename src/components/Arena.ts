import * as THREE from 'three'

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
  private videoElements: Map<string, HTMLVideoElement> = new Map()
  private videoTextures: Map<string, THREE.VideoTexture> = new Map()

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
    { name: 'Stairs', width: 48, height: 16, color: 0xe17055 }
  ]

  constructor() {
    this.group = new THREE.Group()
    this.createPlanes()
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

      // Create plane geometry
      const geometry = new THREE.PlaneGeometry(scaledWidth, scaledHeight)
      
      // Create material with distinct color for each plane
      const material = new THREE.MeshPhongMaterial({ 
        color: config.color,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      })

      const plane = new THREE.Mesh(geometry, material)

      // Use calculated tight positions
      plane.position.set(
        positions[index].x,
        0.1, // Fixed level for all planes
        positions[index].z
      )

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
        originalOpacity: 0.8,
        originalColor: config.color
      }

      // Store reference and add to scene
      this.planes.push(plane)
      this.planeMap.set(config.name, plane)
      this.group.add(plane)

      // Log the plane information to console for reference
      console.log(`${config.name}: ${config.width}x${config.height} (ratio: ${(config.width / config.height).toFixed(2)}) - scaled: ${scaledWidth.toFixed(1)}x${scaledHeight.toFixed(1)})`)
    })

    // Add a subtle grid helper for reference
    const gridHelper = new THREE.GridHelper(60, 30, 0x444444, 0x222222)
    gridHelper.position.y = 0
    this.group.add(gridHelper)
  }

  private calculateTightPositions(scaleFactor: number): Array<{x: number, z: number}> {
    // Calculate scaled dimensions for positioning
    const scaledDimensions = this.planeConfigs.map(config => ({
      width: config.width * scaleFactor,
      height: config.height * scaleFactor,
      name: config.name
    }))

    // Arrange in a 3x3 grid with tight spacing
    const positions: Array<{x: number, z: number}> = []
    const rows = 3
    const cols = 3
    
    // Calculate spacing based on largest dimensions in each row/column
    const rowMaxHeights = [0, 0, 0]
    const colMaxWidths = [0, 0, 0]
    
    // Find max dimensions for each row and column
    scaledDimensions.forEach((dim, index) => {
      const row = Math.floor(index / cols)
      const col = index % cols
      
      rowMaxHeights[row] = Math.max(rowMaxHeights[row], dim.height)
      colMaxWidths[col] = Math.max(colMaxWidths[col], dim.width)
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
            z: currentZ - (rowMaxHeights[0] + rowMaxHeights[1] + rowMaxHeights[2]) / 2 + rowMaxHeights[row] / 2
          })
        }
        currentX += colMaxWidths[col] + 2 // Small gap between columns
      }
      
      currentZ += rowMaxHeights[row] + 2 // Small gap between rows
    }
    
    return positions
  }

  public highlightPlane(planeName: string): void {
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
  }

  public resetHighlight(): void {
    this.planes.forEach(plane => {
      const material = plane.material as THREE.MeshPhongMaterial
      material.opacity = plane.userData.originalOpacity
      material.emissive.setHex(0x000000) // Remove glow
    })
  }

  public update(deltaTime: number): void {
    this.time += deltaTime
    // Remove the pulsing animation to avoid interfering with highlight system
  }

  public async loadVideoOnPlane(planeName: string, videoSource: string | File): Promise<boolean> {
    try {
      const plane = this.planeMap.get(planeName)
      if (!plane) {
        console.error(`Plane ${planeName} not found`)
        return false
      }

      // Clean up existing video if any
      this.clearVideoFromPlane(planeName)

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

      // Set up video loading promise
      const loadPromise = new Promise<boolean>((resolve) => {
        const onCanPlay = () => {
          video.removeEventListener('canplay', onCanPlay)
          video.removeEventListener('error', onError)
          resolve(true)
        }

        const onError = () => {
          video.removeEventListener('canplay', onCanPlay)
          video.removeEventListener('error', onError)
          console.error(`Failed to load video:`, videoSource)
          resolve(false)
        }

        video.addEventListener('canplay', onCanPlay)
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

      // Create new material with video texture
      const videoMaterial = new THREE.MeshPhongMaterial({
        map: videoTexture,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      })

      // Apply the video material to the plane
      plane.material = videoMaterial

      // Store references
      this.videoElements.set(planeName, video)
      this.videoTextures.set(planeName, videoTexture)

      // Start playing the video
      try {
        await video.play()
        console.log(`Video loaded and playing on plane: ${planeName}`)
      } catch (playError) {
        console.warn(`Video loaded but couldn't autoplay on plane: ${planeName}`, playError)
      }

      return true
    } catch (error) {
      console.error(`Error loading video on plane ${planeName}:`, error)
      return false
    }
  }

  public clearVideoFromPlane(planeName: string): void {
    const plane = this.planeMap.get(planeName)
    if (!plane) {
      console.error(`Plane ${planeName} not found`)
      return
    }

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

    // Clean up video resources
    const video = this.videoElements.get(planeName)
    if (video) {
      video.pause()
      video.src = ''
      video.load() // This helps free up memory
      this.videoElements.delete(planeName)
    }

    const texture = this.videoTextures.get(planeName)
    if (texture) {
      texture.dispose()
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

  public getGroup(): THREE.Group {
    return this.group
  }
}

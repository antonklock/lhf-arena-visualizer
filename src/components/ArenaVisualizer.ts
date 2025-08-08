import * as THREE from 'three'
import { CameraController } from './CameraController'
import { Arena } from './Arena'

export class ArenaVisualizer {
  private container: HTMLElement
  private scene: THREE.Scene
  private renderer: THREE.WebGLRenderer
  private camera: THREE.PerspectiveCamera
  private cameraController: CameraController
  private arena: Arena
  private clock: THREE.Clock
  private animationId: number | null = null
  
  // Lighting references and transition state
  private directionalLight1: THREE.DirectionalLight | null = null
  private directionalLight2: THREE.DirectionalLight | null = null
  private targetLight1Intensity: number = 0.4 // Default to paused state
  private targetLight2Intensity: number = 0.3 // Default to paused state
  private lightTransitionSpeed: number = 2.0 // Units per second

  constructor(container: HTMLElement) {
    this.container = container
    this.clock = new THREE.Clock()

    // Initialize Three.js components
    this.initScene()
    this.initRenderer()
    this.initCamera()
    this.initLighting()

    // Initialize custom components
    this.cameraController = new CameraController(this.camera, this.renderer.domElement)
    this.arena = new Arena()
    this.scene.add(this.arena.getGroup())
  }

  private initScene(): void {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x000000)
    this.scene.fog = new THREE.Fog(0x000000, 50, 200)
  }

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance'
    })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    
    this.container.appendChild(this.renderer.domElement)
  }

  private initCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      75, // fov
      window.innerWidth / window.innerHeight, // aspect
      0.1, // near
      1000 // far
    )
    this.camera.position.set(20, 15, 20)
    this.camera.lookAt(0, 0, 0)
  }

  private initLighting(): void {
    // Ambient light for general illumination (very minimal intensity with directional lights)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.01)
    this.scene.add(ambientLight)

    // Main directional light (positioned on one side) - start at paused intensity
    this.directionalLight1 = new THREE.DirectionalLight(0xffffff, this.targetLight1Intensity)
    this.directionalLight1.position.set(50, 50, 25)
    this.directionalLight1.target.position.set(0, 0, 0) // Face the origin
    this.directionalLight1.castShadow = true
    this.directionalLight1.shadow.mapSize.width = 2048
    this.directionalLight1.shadow.mapSize.height = 2048
    this.directionalLight1.shadow.camera.near = 0.1
    this.directionalLight1.shadow.camera.far = 200
    this.directionalLight1.shadow.camera.left = -50
    this.directionalLight1.shadow.camera.right = 50
    this.directionalLight1.shadow.camera.top = 50
    this.directionalLight1.shadow.camera.bottom = -50
    this.scene.add(this.directionalLight1)
    this.scene.add(this.directionalLight1.target) // Add target to scene

    // Second directional light (positioned on opposite side) - start at paused intensity
    this.directionalLight2 = new THREE.DirectionalLight(0xffffff, this.targetLight2Intensity)
    this.directionalLight2.position.set(-50, 50, -25) // Opposite position
    this.directionalLight2.target.position.set(0, 0, 0) // Face the origin
    this.directionalLight2.castShadow = true
    this.directionalLight2.shadow.mapSize.width = 2048
    this.directionalLight2.shadow.mapSize.height = 2048
    this.directionalLight2.shadow.camera.near = 0.1
    this.directionalLight2.shadow.camera.far = 200
    this.directionalLight2.shadow.camera.left = -50
    this.directionalLight2.shadow.camera.right = 50
    this.directionalLight2.shadow.camera.top = 50
    this.directionalLight2.shadow.camera.bottom = -50
    this.scene.add(this.directionalLight2)
    this.scene.add(this.directionalLight2.target) // Add target to scene

    console.log('Dual directional lighting setup complete:')
    console.log('- Light 1 position:', this.directionalLight1.position)
    console.log('- Light 1 target:', this.directionalLight1.target.position)
    console.log('- Light 2 position:', this.directionalLight2.position)
    console.log('- Light 2 target:', this.directionalLight2.target.position)
  }


  public start(): void {
    this.animate()
  }

  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate)
    
    const deltaTime = this.clock.getDelta()
    
    // Update camera controller
    this.cameraController.update(deltaTime)
    
    // Update arena
    this.arena.update(deltaTime)
    
    // Update lighting transitions
    this.updateLightingTransitions(deltaTime)
    
    // Render the scene
    this.renderer.render(this.scene, this.camera)
  }

  public handleResize(): void {
    const width = window.innerWidth
    const height = window.innerHeight
    
    // Update camera
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    
    // Update renderer
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }

  // Lighting transition methods
  private updateLightingTransitions(deltaTime: number): void {
    if (!this.directionalLight1 || !this.directionalLight2) return
    
    // Smoothly transition light 1 intensity
    const light1Diff = this.targetLight1Intensity - this.directionalLight1.intensity
    if (Math.abs(light1Diff) > 0.001) {
      const light1Step = Math.sign(light1Diff) * this.lightTransitionSpeed * deltaTime
      if (Math.abs(light1Step) >= Math.abs(light1Diff)) {
        this.directionalLight1.intensity = this.targetLight1Intensity
      } else {
        this.directionalLight1.intensity += light1Step
      }
    }
    
    // Smoothly transition light 2 intensity
    const light2Diff = this.targetLight2Intensity - this.directionalLight2.intensity
    if (Math.abs(light2Diff) > 0.001) {
      const light2Step = Math.sign(light2Diff) * this.lightTransitionSpeed * deltaTime
      if (Math.abs(light2Step) >= Math.abs(light2Diff)) {
        this.directionalLight2.intensity = this.targetLight2Intensity
      } else {
        this.directionalLight2.intensity += light2Step
      }
    }
  }
  
  // Dynamic lighting control methods
  public setLightingForVideoState(isPlaying: boolean): void {
    if (isPlaying) {
      // Videos playing - dim lights
      this.targetLight1Intensity = 0.1
      this.targetLight2Intensity = 0.08
      console.log('Transitioning to playing state lighting (dimmer)')
    } else {
      // Videos paused - brighter lights
      this.targetLight1Intensity = 0.4
      this.targetLight2Intensity = 0.3
      console.log('Transitioning to paused state lighting (brighter)')
    }
  }
  
  public updateLightingBasedOnVideoState(): void {
    const videoInfo = this.arena.getVideoPlaybackInfo()
    const hasVideos = videoInfo.videoCount > 0
    const isPlaying = hasVideos && videoInfo.isPlaying
    
    // Only update if there are videos loaded
    if (hasVideos) {
      this.setLightingForVideoState(isPlaying)
    } else {
      // No videos - use paused state lighting
      this.setLightingForVideoState(false)
    }
  }

  // Getters for debugging
  public getScene(): THREE.Scene { return this.scene }
  public getCamera(): THREE.Camera { return this.camera }
  public getRenderer(): THREE.WebGLRenderer { return this.renderer }
  public getArena(): Arena { return this.arena }
}

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
    this.scene.background = new THREE.Color(0x1a1a2e)
    this.scene.fog = new THREE.Fog(0x1a1a2e, 50, 200)
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
    // Ambient light for general illumination (increased intensity for testing)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0)
    this.scene.add(ambientLight)

    // Disabled lights for testing - uncomment when needed
    /*
    // Main directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(50, 50, 25)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.1
    directionalLight.shadow.camera.far = 200
    directionalLight.shadow.camera.left = -50
    directionalLight.shadow.camera.right = 50
    directionalLight.shadow.camera.top = 50
    directionalLight.shadow.camera.bottom = -50
    this.scene.add(directionalLight)

    // Point light for additional warmth
    const pointLight = new THREE.PointLight(0xff6b35, 0.5, 100)
    pointLight.position.set(-20, 10, -20)
    this.scene.add(pointLight)
    */
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

  // Getters for debugging
  public getScene(): THREE.Scene { return this.scene }
  public getCamera(): THREE.Camera { return this.camera }
  public getRenderer(): THREE.WebGLRenderer { return this.renderer }
  public getArena(): Arena { return this.arena }
}

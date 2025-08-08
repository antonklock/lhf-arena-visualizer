import * as THREE from 'three'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'

export class Label2DManager {
  private scene: THREE.Scene
  private labels: THREE.Mesh[] = []
  private labelMap: Map<string, THREE.Mesh> = new Map()
  private font: THREE.Font | null = null
  private fontLoader: FontLoader = new FontLoader()
  private camera2D: THREE.OrthographicCamera | null = null

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.loadFont()
  }

  private async loadFont(): Promise<void> {
    try {
      // Use a simple font URL or fallback to basic geometry if font loading fails
      this.font = await new Promise<THREE.Font>((resolve, reject) => {
        this.fontLoader.load(
          'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
          (font) => resolve(font),
          undefined,
          (error) => reject(error)
        )
      })
      console.log('Font loaded successfully for 2D labels')
    } catch (error) {
      console.warn('Could not load font for labels, using fallback method:', error)
      // We'll create simple box labels instead
    }
  }

  public createLabelsForPlanes(planes: Map<string, THREE.Mesh>): void {
    // Clear existing labels
    this.clearLabels()

    planes.forEach((plane, planeName) => {
      this.createLabelForPlane(planeName, plane)
    })
  }

  private createLabelForPlane(planeName: string, plane: THREE.Mesh): void {
    // Create canvas-based text texture
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    
    // Set canvas size
    const fontSize = 64
    canvas.width = 512
    canvas.height = 128
    
    // Configure text style
    context.fillStyle = 'rgba(0, 0, 0, 0)' // Transparent background
    context.fillRect(0, 0, canvas.width, canvas.height)
    
    context.fillStyle = '#ffffff'
    context.font = `${fontSize}px Arial, sans-serif` // Regular weight (not bold)
    context.textAlign = 'left'
    context.textBaseline = 'top'
    
    // Add text shadow for better visibility
    context.shadowColor = '#000000'
    context.shadowOffsetX = 2
    context.shadowOffsetY = 2
    context.shadowBlur = 4
    
    // Draw the text
    context.fillText(planeName, 10, 10)
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    
    // Create label geometry and material
    const labelWidth = 2.0 // Fixed width for all labels
    const labelHeight = 0.5 // Fixed height for all labels
    const labelGeometry = new THREE.PlaneGeometry(labelWidth, labelHeight)
    const labelMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide
    })

    const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial)

    // Position the label at the top-left of the plane
    this.positionLabelAtTopLeft(labelMesh, plane)

    // Rotate to be flat on the ground (same as planes)
    labelMesh.rotation.x = -Math.PI / 2
    
    // Slightly above the plane to avoid z-fighting
    labelMesh.position.y = 0.15

    // Store and add to scene
    this.labels.push(labelMesh)
    this.labelMap.set(planeName, labelMesh)
    this.scene.add(labelMesh)
  }

  private positionLabelAtTopLeft(label: THREE.Mesh, plane: THREE.Mesh): void {
    // Get plane geometry to calculate bounds
    const geometry = plane.geometry as THREE.PlaneGeometry
    const planeWidth = geometry.parameters.width
    const planeHeight = geometry.parameters.height

    // Position above the top-left corner of the plane, but closer to the plane
    // For labels, we want them positioned above the plane, not covering it
    const labelWidth = 2.0 // Should match the labelWidth in createLabelForPlane
    const offsetX = -planeWidth / 2 + labelWidth / 2 + 0.1 // Position label so it starts at plane edge
    const offsetZ = -planeHeight / 2 - 0.1 // Closer to the plane (reduced from -0.3 to -0.1)

    label.position.x = plane.position.x + offsetX
    label.position.z = plane.position.z + offsetZ
  }

  public setVisible(visible: boolean): void {
    this.labels.forEach(label => {
      label.visible = visible
    })
  }

  public clearLabels(): void {
    this.labels.forEach(label => {
      this.scene.remove(label)
      label.geometry.dispose()
      if (Array.isArray(label.material)) {
        label.material.forEach(mat => mat.dispose())
      } else {
        label.material.dispose()
      }
    })
    this.labels = []
    this.labelMap.clear()
  }

  public updateLabelVisibility(planeName: string, visible: boolean): void {
    const label = this.labelMap.get(planeName)
    if (label) {
      label.visible = visible
    }
  }

  public highlightLabel(planeName: string): void {
    this.labelMap.forEach((label, name) => {
      const material = label.material as THREE.MeshBasicMaterial
      if (name === planeName) {
        // Highlight this label
        material.color.setHex(0xffff00) // Yellow highlight
        material.opacity = 1.0
      } else {
        // Reset other labels
        material.color.setHex(0xffffff) // White
        material.opacity = 0.9
      }
    })
  }

  public resetHighlight(): void {
    this.labelMap.forEach((label) => {
      const material = label.material as THREE.MeshBasicMaterial
      material.color.setHex(0xffffff) // White
      material.opacity = 0.9
    })
  }

  public setCamera2D(camera: THREE.OrthographicCamera): void {
    this.camera2D = camera
    this.updateLabelScales()
  }

  public updateLabelScales(): void {
    if (!this.camera2D) return

    // Keep labels at constant size regardless of camera zoom
    // Calculate inverse scale to counteract camera zoom effects
    const cameraFrustumSize = (this.camera2D.top - this.camera2D.bottom)
    const baseScale = cameraFrustumSize / 30.0 // 30 is the default frustum size
    const constantScale = 1.0 / baseScale // Inverse scale to maintain constant size

    // Update all label scales to remain constant
    this.labels.forEach(label => {
      label.scale.setScalar(constantScale)
    })
  }

  public dispose(): void {
    this.clearLabels()
  }
}

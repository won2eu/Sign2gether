import DropFileZone from './DropFileZone'

export default function DropFileSection() {
  return (
    <div 
      className="w-full min-h-screen flex items-center justify-center py-16"
      style={{
        background: 'linear-gradient(135deg, #dbeafe 50%, #e9d5ff 70%, #fce7f3 100%)'
      }}
    >
      <DropFileZone />
    </div>
  )
} 
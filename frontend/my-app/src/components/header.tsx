import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export default function Header() {
  return (
    <div className="w-full bg-white">
      {/* Main Navigation Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        {/* Logo */}
        <div className="flex items-center">
          <div className="w-6 h-6 bg-black rounded-sm mr-3 flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-sm transform rotate-45"></div>
          </div>
          <span className="text-xl font-semibold text-gray-900">Sign2gether</span>
        </div>

        {/* Navigation Menu */}
        <nav className="flex items-center space-x-6">
          <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">
            Home
          </a>
          <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">
            Documents
          </a>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium">
            New
          </Button>
          <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">
            Sign In
          </a>
        </nav>
      </header>

      {/* Download Button Section */}
      <div className="flex justify-end px-6 py-3">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center space-x-2 text-gray-700 border-gray-300 hover:bg-gray-50 bg-transparent"
        >
          <Download className="w-4 h-4" />
          <span>Download</span>
        </Button>
      </div>
    </div>
  )
}

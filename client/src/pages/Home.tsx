import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Download, ArrowRight, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Home() {
  const [location, setLocation] = useLocation();
  const [selectedOption, setSelectedOption] = useState<'upload' | 'download' | null>(null);

  const handleContinue = () => {
    if (selectedOption === 'upload') {
      setLocation('/upload');
    } else if (selectedOption === 'download') {
      setLocation('/download');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <h2 className="text-3xl font-bold text-slate-900 flex items-center">
              Welcome to ClickHouse <ArrowLeftRight className="mx-2 h-8 w-8 text-blue-500" /> FlatFile
            </h2>
          </div>
          <p className="text-slate-600 max-w-2xl mx-auto">Choose an option to begin working with your ClickHouse database.</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-8">
          {/* Upload Option Card */}
          <Card 
            className={cn(
              "border transition cursor-pointer",
              selectedOption === 'upload' 
                ? "border-blue-500 shadow-lg ring-2 ring-blue-200" 
                : "border-slate-200 hover:shadow-md"
            )}
            onClick={() => setSelectedOption('upload')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mx-auto mb-4">
                <Upload className={cn(
                  "h-8 w-8", 
                  selectedOption === 'upload' ? "text-blue-600" : "text-blue-500"
                )} />
              </div>
              <h3 className="text-xl font-semibold text-center mb-2">Upload to ClickHouse</h3>
              <p className="text-slate-600 text-center mb-4">Upload CSV or other data files to your ClickHouse database.</p>
            </CardContent>
          </Card>

          {/* Download Option Card */}
          <Card 
            className={cn(
              "border transition cursor-pointer",
              selectedOption === 'download' 
                ? "border-blue-500 shadow-lg ring-2 ring-blue-200" 
                : "border-slate-200 hover:shadow-md"
            )}
            onClick={() => setSelectedOption('download')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mx-auto mb-4">
                <Download className={cn(
                  "h-8 w-8", 
                  selectedOption === 'download' ? "text-blue-600" : "text-blue-500"
                )} />
              </div>
              <h3 className="text-xl font-semibold text-center mb-2">Download from ClickHouse</h3>
              <p className="text-slate-600 text-center mb-4">Query and download data from your ClickHouse database.</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button 
            onClick={handleContinue}
            disabled={!selectedOption}
            className="w-48 bg-blue-600 hover:bg-blue-700"
          >
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

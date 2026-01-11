import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Separator } from '@/components/ui/Separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Skeleton } from '@/components/ui/Skeleton';

export function ComponentsDemoPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');
  const [progressValue, setProgressValue] = useState(45);

  const showToast = (type: 'default' | 'success' | 'error' | 'warning' | 'info') => {
    const messages = {
      default: 'This is a default notification',
      success: 'Success! Your action completed',
      error: 'Error! Something went wrong',
      warning: 'Warning! Please check this',
      info: 'Info: Here is some information',
    };

    switch (type) {
      case 'success':
        toast.success(messages.success);
        break;
      case 'error':
        toast.error(messages.error);
        break;
      case 'warning':
        toast.warning(messages.warning);
        break;
      case 'info':
        toast.info(messages.info);
        break;
      default:
        toast(messages.default);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="text-4xl font-bold mb-2">UI Components Demo</h1>
        <p className="text-muted-foreground">
          Comprehensive showcase of all available UI components
        </p>
      </div>

      {/* Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
          <CardDescription>Various button variants and sizes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-3">Variants</h4>
            <div className="flex flex-wrap gap-2">
              <Button variant="default">Default</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h4 className="text-sm font-medium mb-3">Sizes</h4>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Cards</CardTitle>
          <CardDescription>Card components with header, content, and footer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Simple Card</CardTitle>
                <CardDescription>Basic card layout</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">Card content goes here with some text.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">With Footer</CardTitle>
                <CardDescription>Card with action footer</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">Card with footer actions below.</p>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="outline">Action</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">With Badge</CardTitle>
                <CardDescription>Card with status indicator</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge variant="success">Active</Badge>
                <p className="text-sm">Status indicated by badge.</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Inputs */}
      <Card>
        <CardHeader>
          <CardTitle>Input Fields</CardTitle>
          <CardDescription>Text inputs with various states</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Default Input"
            placeholder="Enter text..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          
          <Input
            label="With Helper Text"
            placeholder="example@email.com"
            helperText="We'll never share your email"
            type="email"
          />
          
          <Input
            label="Required Field"
            placeholder="Required..."
            required
          />
          
          <Input
            label="With Error"
            placeholder="Invalid input"
            error="This field is required"
          />
          
          <Input
            label="Disabled"
            placeholder="Disabled input"
            disabled
          />
        </CardContent>
      </Card>

      {/* Textarea */}
      <Card>
        <CardHeader>
          <CardTitle>Textarea</CardTitle>
          <CardDescription>Multiline text input with character counter</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            label="Without Counter"
            placeholder="Enter your message..."
            value={textareaValue}
            onChange={(e) => setTextareaValue(e.target.value)}
          />
          
          <Textarea
            label="With Character Counter"
            placeholder="Max 200 characters..."
            maxLength={200}
            showCharacterCount
            helperText="Brief description required"
          />
          
          <Textarea
            label="With Error"
            placeholder="Invalid content"
            error="Message is too short"
          />
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Badges</CardTitle>
          <CardDescription>Status indicators with different variants</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">Default</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Bars</CardTitle>
          <CardDescription>Linear progress indicators</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-3">With Label</h4>
            <Progress value={progressValue} showLabel />
            <div className="flex gap-2 mt-4">
              <Button size="sm" onClick={() => setProgressValue(Math.max(0, progressValue - 10))}>
                Decrease
              </Button>
              <Button size="sm" onClick={() => setProgressValue(Math.min(100, progressValue + 10))}>
                Increase
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Variants</h4>
            <Progress value={75} variant="default" size="sm" />
            <Progress value={60} variant="success" size="md" />
            <Progress value={45} variant="warning" size="md" />
            <Progress value={30} variant="error" size="lg" />
          </div>
        </CardContent>
      </Card>

      {/* Separators */}
      <Card>
        <CardHeader>
          <CardTitle>Separators</CardTitle>
          <CardDescription>Horizontal and vertical dividers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-3">Horizontal</h4>
            <p className="text-sm text-muted-foreground">Content above</p>
            <Separator className="my-4" />
            <p className="text-sm text-muted-foreground">Content below</p>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Vertical</h4>
            <div className="flex items-center gap-4 h-8">
              <span className="text-sm">Left</span>
              <Separator orientation="vertical" />
              <span className="text-sm">Middle</span>
              <Separator orientation="vertical" />
              <span className="text-sm">Right</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Card>
        <CardHeader>
          <CardTitle>Dialog</CardTitle>
          <CardDescription>Modal dialogs for critical actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setDialogOpen(true)}>Open Dialog</Button>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Action</DialogTitle>
                <DialogDescription>
                  Are you sure you want to proceed? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <p className="text-sm text-muted-foreground">
                  Additional dialog content can go here. The dialog can be closed by clicking
                  outside, pressing Escape, or using the buttons below.
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDialogOpen(false);
                    toast.success('Action confirmed!');
                  }}
                >
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Toast */}
      <Card>
        <CardHeader>
          <CardTitle>Toast Notifications</CardTitle>
          <CardDescription>Non-blocking notifications with auto-dismiss</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => showToast('default')}>
              Default
            </Button>
            <Button variant="outline" onClick={() => showToast('success')}>
              Success
            </Button>
            <Button variant="outline" onClick={() => showToast('error')}>
              Error
            </Button>
            <Button variant="outline" onClick={() => showToast('warning')}>
              Warning
            </Button>
            <Button variant="outline" onClick={() => showToast('info')}>
              Info
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Skeleton */}
      <Card>
        <CardHeader>
          <CardTitle>Skeleton Loaders</CardTitle>
          <CardDescription>Loading placeholders that match content shape</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-3">Text Skeleton</h4>
            <div className="space-y-2">
              <Skeleton variant="text" className="w-full" />
              <Skeleton variant="text" className="w-4/5" />
              <Skeleton variant="text" className="w-3/5" />
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-3">Card Skeleton</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <Skeleton variant="circular" className="w-12 h-12" />
                <div className="flex-1 space-y-2">
                  <Skeleton variant="text" className="w-1/3" />
                  <Skeleton variant="text" className="w-full" />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-3">Rectangular Skeleton</h4>
            <Skeleton variant="rectangular" className="w-full h-32" />
          </div>
        </CardContent>
      </Card>

      {/* Accessibility Features */}
      <Card>
        <CardHeader>
          <CardTitle>Accessibility Features</CardTitle>
          <CardDescription>Built-in accessibility support</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Keyboard navigation with visible focus indicators</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>ARIA labels and roles for screen readers</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Minimum 44px touch targets for mobile</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Proper color contrast ratios</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Error states with descriptive messages</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Disabled states properly indicated</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

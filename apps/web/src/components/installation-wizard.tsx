"use client";

import React, { useReducer, useState, useCallback, useEffect } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Key,
  Settings,
  User,
  Database,
  Check,
  ArrowRight,
  ArrowLeft,
  EyeOff,
  Eye,
} from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Label,
  Textarea,
  Checkbox,
  Alert,
  AlertDescription,
  Progress,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Form state management
interface FormState {
  siteName: string;
  siteDescription: string;
  adminUsername: string;
  adminEmail: string;
  adminPassword: string;
  confirmPassword: string;
  seedSampleData: boolean;
  enableTwoFactor: boolean;
}

type FormAction =
  | { type: "UPDATE_FIELD"; field: keyof FormState; value: string | boolean }
  | { type: "RESET" };

const initialFormState: FormState = {
  siteName: "",
  siteDescription: "",
  adminUsername: "",
  adminEmail: "",
  adminPassword: "",
  confirmPassword: "",
  seedSampleData: true,
  enableTwoFactor: false,
};

const formReducer = (state: FormState, action: FormAction): FormState => {
  switch (action.type) {
    case "UPDATE_FIELD":
      return { ...state, [action.field]: action.value };
    case "RESET":
      return initialFormState;
    default:
      return state;
  }
};

// Step configuration
interface Step {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

const steps: Step[] = [
  { id: "verify", title: "License Verification", icon: Key },
  { id: "configure", title: "Site Setup", icon: Settings },
  { id: "admin", title: "Admin Account", icon: User },
  { id: "install", title: "Installation", icon: Database },
  { id: "complete", title: "Complete", icon: CheckCircle2 },
];

const InstallationWizard = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseCode, setPurchaseCode] = useState("");
  const [formState, dispatch] = useReducer(formReducer, initialFormState);
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string;
  }>({});
  const [showPassword, setShowPassword] = useState(false);
  // Password strength calculation
  const calculatePasswordStrength = useCallback((password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return {
      score,
      text: ["Very Weak", "Weak", "Fair", "Good", "Strong"][score],
      color: [
        "bg-destructive",
        "bg-orange-500",
        "bg-yellow-500",
        "bg-blue-500",
        "bg-green-500",
      ][score],
    };
  }, []);

  const passwordStrength = calculatePasswordStrength(formState.adminPassword);

  // Validation
  const validateField = useCallback(
    (name: string, value: string) => {
      const errors: { [key: string]: string } = {};
      switch (name) {
        case "siteName":
          if (value.trim().length < 2)
            errors[name] = "Site name must be at least 2 characters";
          break;
        case "adminUsername":
          if (value.trim().length < 3)
            errors[name] = "Username must be at least 3 characters";
          break;
        case "adminEmail":
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
            errors[name] = "Invalid email address";
          break;
        case "adminPassword":
          if (value.length < 8)
            errors[name] = "Password must be at least 8 characters";
          break;
        case "confirmPassword":
          if (value !== formState.adminPassword)
            errors[name] = "Passwords do not match";
          break;
      }
      setValidationErrors((prev) => {
        const newErrors = { ...prev, ...errors };
        if (!errors[name]) delete newErrors[name];
        return newErrors;
      });
      return !errors[name];
    },
    [formState.adminPassword]
  );

  // Debounced form state for validation
  const debouncedFormState = useDebounce(formState, 300);

  // Handlers
  const handleFieldChange = useCallback(
    (field: keyof FormState, value: string | boolean) => {
      dispatch({ type: "UPDATE_FIELD", field, value });
      if (typeof value === "string") validateField(field, value);
    },
    [validateField]
  );

  const handlePurchaseVerification = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!purchaseCode) {
        toast("Please enter a purchase code");
        return;
      }
      setIsLoading(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        toast("Purchase code verified!");
        setCurrentStep(1);
      } catch {
        toast("Invalid purchase code.");
      } finally {
        setIsLoading(false);
      }
    },
    [purchaseCode, toast]
  );

  const handleInstallation = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const fields = [
        "siteName",
        "adminUsername",
        "adminEmail",
        "adminPassword",
        "confirmPassword",
      ];
      const isValid = fields.every((field) =>
        validateField(field, formState[field as keyof FormState] as string)
      );
      if (!isValid || passwordStrength.score < 3) {
        toast("Please fix all errors.");
        return;
      }
      setIsLoading(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        toast("Vyral CMS installed successfully!");
        setCurrentStep(4);
      } catch {
        toast("Installation failed.");
        setCurrentStep(3);
      } finally {
        setIsLoading(false);
      }
    },
    [formState, passwordStrength.score, validateField, toast]
  );

  const nextStep = useCallback(() => {
    if (currentStep === 1 && !validateField("siteName", formState.siteName)) {
      toast("Please enter a valid site name.");
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  }, [currentStep, formState.siteName, validateField, toast]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  // Step Indicator
  const StepIndicator = React.memo(() => (
    <div className="mb-8">
      <Progress value={((currentStep + 1) / steps.length) * 100} />
      <div className="flex justify-between mt-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                currentStep >= index
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              <step.icon className="w-4 h-4" />
            </div>
            <span className="text-xs mt-2">{step.title}</span>
          </div>
        ))}
      </div>
    </div>
  ));

  // Step Components
  const LicenseVerificationStep = React.memo(() => (
    <Card>
      <CardHeader>
        <CardTitle>Verify License</CardTitle>
        <CardDescription>Enter your purchase code.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePurchaseVerification} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="purchaseCode">Purchase Code</Label>
            <Input
              id="purchaseCode"
              value={purchaseCode}
              onChange={(e) => setPurchaseCode(e.target.value)}
              placeholder="xxxx-xxxx-xxxx-xxxx"
              disabled={isLoading}
            />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              "Verify"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  ));

  const SiteSetupStep = React.memo(() => (
    <Card>
      <CardHeader>
        <CardTitle>Site Setup</CardTitle>
        <CardDescription>Configure your website.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="siteName">Site Name</Label>
            <Input
              id="siteName"
              value={formState.siteName}
              onChange={(e) => handleFieldChange("siteName", e.target.value)}
              placeholder="My Website"
              aria-invalid={!!validationErrors.siteName}
            />
            {validationErrors.siteName && (
              <Alert variant="destructive">
                <AlertDescription>{validationErrors.siteName}</AlertDescription>
              </Alert>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="siteDescription">Description</Label>
            <Textarea
              id="siteDescription"
              value={formState.siteDescription}
              onChange={(e) =>
                handleFieldChange("siteDescription", e.target.value)
              }
              placeholder="Describe your website..."
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="seedSampleData"
              checked={formState.seedSampleData}
              onCheckedChange={(checked) =>
                handleFieldChange("seedSampleData", checked)
              }
            />
            <Label htmlFor="seedSampleData">Include sample content</Label>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={prevStep} disabled={isLoading}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={nextStep} disabled={isLoading}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  ));

  const AdminAccountStep = React.memo(() => (
    <Card>
      <CardHeader>
        <CardTitle>Admin Account</CardTitle>
        <CardDescription>Create your admin credentials.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleInstallation} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adminUsername">Username</Label>
              <Input
                id="adminUsername"
                value={formState.adminUsername}
                onChange={(e) =>
                  handleFieldChange("adminUsername", e.target.value)
                }
                placeholder="admin"
                aria-invalid={!!validationErrors.adminUsername}
              />
              {validationErrors.adminUsername && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {validationErrors.adminUsername}
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Email</Label>
              <Input
                id="adminEmail"
                type="email"
                value={formState.adminEmail}
                onChange={(e) =>
                  handleFieldChange("adminEmail", e.target.value)
                }
                placeholder="admin@example.com"
                aria-invalid={!!validationErrors.adminEmail}
              />
              {validationErrors.adminEmail && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {validationErrors.adminEmail}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminPassword">Password</Label>
            <div className="relative">
              <Input
                id="adminPassword"
                type={showPassword ? "text" : "password"}
                value={formState.adminPassword}
                onChange={(e) =>
                  handleFieldChange("adminPassword", e.target.value)
                }
                placeholder="Enter password"
                aria-invalid={!!validationErrors.adminPassword}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
            {formState.adminPassword && (
              <div className="text-sm">
                Strength:{" "}
                <span
                  className={
                    passwordStrength.score >= 3
                      ? "text-green-600"
                      : "text-destructive"
                  }
                >
                  {passwordStrength.text}
                </span>
                <Progress
                  value={(passwordStrength.score / 5) * 100}
                  className={passwordStrength.color}
                />
              </div>
            )}
            {validationErrors.adminPassword && (
              <Alert variant="destructive">
                <AlertDescription>
                  {validationErrors.adminPassword}
                </AlertDescription>
              </Alert>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={formState.confirmPassword}
                onChange={(e) =>
                  handleFieldChange("confirmPassword", e.target.value)
                }
                placeholder="Confirm password"
                aria-invalid={!!validationErrors.confirmPassword}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
            {validationErrors.confirmPassword && (
              <Alert variant="destructive">
                <AlertDescription>
                  {validationErrors.confirmPassword}
                </AlertDescription>
              </Alert>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableTwoFactor"
              checked={formState.enableTwoFactor}
              onCheckedChange={(checked) =>
                handleFieldChange("enableTwoFactor", checked)
              }
            />
            <Label htmlFor="enableTwoFactor">Enable 2FA</Label>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={prevStep} disabled={isLoading}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                "Install"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  ));

  const InstallationStep = React.memo(() => (
    <Card>
      <CardHeader>
        <CardTitle>Installing Vyral CMS</CardTitle>
        <CardDescription>Configuring your system...</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
        <p className="mt-4 text-muted-foreground">Setting up database...</p>
      </CardContent>
    </Card>
  ));

  const CompletionStep = React.memo(() => (
    <Card>
      <CardHeader>
        <CardTitle>Installation Complete</CardTitle>
        <CardDescription>Your Vyral CMS is ready!</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Alert variant="success" className="mb-6">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>Successfully installed Vyral CMS.</AlertDescription>
        </Alert>
        <div className="space-y-4">
          <p className="text-sm">
            Login: <span className="font-mono">{formState.adminEmail}</span>
          </p>
          <p className="text-sm">
            URL: <span className="font-mono">/admin</span>
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild>
              <a href="/admin">Go to Admin</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="https://docs.vyral.com">View Docs</a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  ));

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Vyral CMS Setup</h1>
          <p className="text-muted-foreground">
            Install your CMS in a few steps
          </p>
        </div>
        <StepIndicator />
        {currentStep === 0 && <LicenseVerificationStep />}
        {currentStep === 1 && <SiteSetupStep />}
        {currentStep === 2 && <AdminAccountStep />}
        {currentStep === 3 && <InstallationStep />}
        {currentStep === 4 && <CompletionStep />}
      </div>
    </div>
  );
};

export default InstallationWizard;

import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  Database,
  User,
  Settings,
  Eye,
  EyeOff,
} from "lucide-react";

interface InstallationStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

interface PurchaseVerificationData {
  item: {
    name: string;
    author: string;
    purchaseDate: string;
    license: string;
    buyer: string;
  };
  installationId: string;
}

interface ValidationErrors {
  [key: string]: string;
}

const InstallationWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Form data
  const [purchaseCode, setPurchaseCode] = useState("");
  const [verificationData, setVerificationData] =
    useState<PurchaseVerificationData | null>(null);

  const [formData, setFormData] = useState({
    siteName: "",
    siteDescription: "",
    adminUsername: "",
    adminEmail: "",
    adminPassword: "",
    confirmPassword: "",
    adminDisplayName: "",
    seedSampleData: true,
    enableTwoFactor: false,
    strongPasswordPolicy: true,
  });

  const [installationSteps, setInstallationSteps] = useState<
    InstallationStep[]
  >([
    {
      id: "verify",
      title: "Purchase Verification",
      description: "Verify your CodeCanyon purchase code",
      completed: false,
    },
    {
      id: "configure",
      title: "Site Configuration",
      description: "Configure your site settings",
      completed: false,
    },
    {
      id: "admin",
      title: "Admin Account",
      description: "Create your administrator account",
      completed: false,
    },
    {
      id: "install",
      title: "Installation",
      description: "Install and configure Vyral CMS",
      completed: false,
    },
    {
      id: "complete",
      title: "Complete",
      description: "Installation completed successfully",
      completed: false,
    },
  ]);

  // Enhanced validation functions
  const validateField = (fieldName: string, value: string): string => {
    switch (fieldName) {
      case "siteName":
        if (!value.trim()) return "Site name is required";
        if (value.trim().length < 3)
          return "Site name must be at least 3 characters long";
        return "";

      case "adminDisplayName":
        if (!value.trim()) return "Display name is required";
        if (value.trim().length < 2)
          return "Display name must be at least 2 characters long";
        return "";

      case "adminUsername":
        if (!value.trim()) return "Username is required";
        if (value.length < 3)
          return "Username must be at least 3 characters long";
        if (!/^[a-zA-Z0-9_]+$/.test(value))
          return "Username can only contain letters, numbers, and underscores";
        return "";

      case "adminEmail":
        if (!value.trim()) return "Email address is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          return "Please enter a valid email address";
        return "";

      case "adminPassword":
        if (!value) return "Password is required";
        if (value.length < 8)
          return "Password must be at least 8 characters long";
        const strongPasswordPattern =
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
        if (!strongPasswordPattern.test(value))
          return "Password must contain uppercase, lowercase, number, and special character";
        return "";

      case "confirmPassword":
        if (!value) return "Please confirm your password";
        if (value !== formData.adminPassword) return "Passwords do not match";
        return "";

      default:
        return "";
    }
  };

  // Handle field blur with smart validation
  const handleFieldBlur = (fieldName: string, value: string) => {
    setTouchedFields((prev) => new Set(prev).add(fieldName));

    // Only validate if the field has content or was previously touched
    if (value.trim() || touchedFields.has(fieldName)) {
      const error = validateField(fieldName, value);
      setValidationErrors((prev) => ({
        ...prev,
        [fieldName]: error,
      }));
    }
  };

  // Handle field change with real-time validation for touched fields
  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));

    // Clear general error when user starts typing
    if (error) setError("");

    // Only validate if field was previously touched or has sufficient content
    if (touchedFields.has(fieldName) || value.length >= 2) {
      const validationError = validateField(fieldName, value);
      setValidationErrors((prev) => ({
        ...prev,
        [fieldName]: validationError,
      }));
    }
  };

  // Check if form section is valid
  const isSiteConfigValid = () => {
    return (
      formData.siteName.trim().length >= 3 &&
      formData.adminDisplayName.trim().length >= 2 &&
      !validationErrors.siteName &&
      !validationErrors.adminDisplayName
    );
  };

  const isAdminSetupValid = () => {
    return (
      formData.adminUsername.length >= 3 &&
      /^[a-zA-Z0-9_]+$/.test(formData.adminUsername) &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail) &&
      formData.adminPassword.length >= 8 &&
      passwordStrength.score >= 4 &&
      formData.confirmPassword === formData.adminPassword &&
      !Object.values(validationErrors).some((error) => error)
    );
  };

  // Password strength checker
  const checkPasswordStrength = (password: string) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&]/.test(password),
    };

    const score = Object.values(checks).filter(Boolean).length;
    return { checks, score };
  };

  const passwordStrength = checkPasswordStrength(formData.adminPassword);

  // Handle purchase code verification
  const handlePurchaseVerification = async (
    e?: React.FormEvent | React.KeyboardEvent
  ) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/install/verify-purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          purchaseCode: purchaseCode.trim(),
          clientFingerprint: navigator.userAgent,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setVerificationData(data.data);
        setSuccess("Purchase code verified successfully!");
        updateStepCompletion("verify", true);
        setTimeout(() => setCurrentStep(2), 1500);
      } else {
        setError(data.message || "Purchase verification failed");
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle installation
  const handleInstallation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (formData.adminPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (passwordStrength.score < 4) {
      setError("Password does not meet security requirements");
      return;
    }

    setIsLoading(true);
    setError("");
    setCurrentStep(4);

    try {
      const response = await fetch("/api/install/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          purchaseCode,
          siteName: formData.siteName,
          siteDescription: formData.siteDescription,
          adminUser: {
            username: formData.adminUsername,
            email: formData.adminEmail,
            password: formData.adminPassword,
            displayName: formData.adminDisplayName,
          },
          databaseConfig: {
            seedSampleData: formData.seedSampleData,
          },
          securityConfig: {
            enableTwoFactor: formData.enableTwoFactor,
            strongPasswordPolicy: formData.strongPasswordPolicy,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        updateStepCompletion("install", true);
        setCurrentStep(5);
        setSuccess("Vyral CMS installed successfully!");

        // Store installation data for completion step
        localStorage.setItem(
          "vyral_installation_data",
          JSON.stringify(data.data)
        );
      } else {
        setError(data.message || "Installation failed");
        setCurrentStep(3);
      }
    } catch (err) {
      setError("Installation failed. Please try again.");
      setCurrentStep(3);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStepCompletion = (stepId: string, completed: boolean) => {
    setInstallationSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, completed } : step))
    );
  };

  const StepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {installationSteps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`
              flex items-center justify-center w-10 h-10 rounded-full border-2 
              ${
                step.completed
                  ? "bg-green-500 border-green-500 text-white"
                  : currentStep > index + 1
                    ? "bg-blue-500 border-blue-500 text-white"
                    : currentStep === index + 1
                      ? "bg-blue-100 border-blue-500 text-blue-500"
                      : "bg-gray-100 border-gray-300 text-gray-400"
              }
            `}
            >
              {step.completed ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </div>
            {index < installationSteps.length - 1 && (
              <div
                className={`
                w-16 h-1 mx-2 
                ${step.completed ? "bg-green-500" : "bg-gray-200"}
              `}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {installationSteps.map((step) => (
          <div key={step.id} className="text-center max-w-24">
            <p className="text-xs font-medium text-gray-900">{step.title}</p>
            <p className="text-xs text-gray-500">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // Input component with validation
  const ValidatedInput = ({
    id,
    label,
    type = "text",
    placeholder,
    value,
    onChange,
    required = false,
    description,
    showPasswordToggle = false,
    showPassword = false,
    onTogglePassword,
  }: {
    id: string;
    label: string;
    type?: string;
    placeholder?: string;
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
    description?: string;
    showPasswordToggle?: boolean;
    showPassword?: boolean;
    onTogglePassword?: () => void;
  }) => {
    const hasError = validationErrors[id] && touchedFields.has(id);

    return (
      <div>
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <input
            type={type}
            id={id}
            value={value}
            onChange={(e) => handleFieldChange(id, e.target.value)}
            onBlur={(e) => handleFieldBlur(id, e.target.value)}
            placeholder={placeholder}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              hasError ? "border-red-300 bg-red-50" : "border-gray-300"
            } ${showPasswordToggle ? "pr-12" : ""}`}
          />
          {showPasswordToggle && onTogglePassword && (
            <button
              type="button"
              onClick={onTogglePassword}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
        {hasError && (
          <p className="text-red-500 text-sm mt-1">{validationErrors[id]}</p>
        )}
        {description && !hasError && (
          <p className="text-gray-500 text-sm mt-1">{description}</p>
        )}
      </div>
    );
  };

  const PurchaseVerificationStep = () => (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <Shield className="w-16 h-16 text-blue-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Verify Purchase Code
        </h2>
        <p className="text-gray-600">
          Enter your CodeCanyon purchase code to continue with the installation.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label
            htmlFor="purchaseCode"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Purchase Code
          </label>
          <input
            type="text"
            id="purchaseCode"
            value={purchaseCode}
            onChange={(e) => setPurchaseCode(e.target.value)}
            placeholder="12345678-1234-1234-1234-123456789012"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) =>
              e.key === "Enter" && handlePurchaseVerification(e)
            }
          />
          <p className="text-sm text-gray-500 mt-1">
            Find your purchase code in your CodeCanyon downloads page
          </p>
        </div>

        {error && (
          <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-green-700 text-sm">{success}</span>
          </div>
        )}

        <button
          onClick={handlePurchaseVerification}
          disabled={isLoading || !purchaseCode.trim()}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify Purchase Code"
          )}
        </button>
      </div>
    </div>
  );

  const SiteConfigurationStep = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <Settings className="w-16 h-16 text-blue-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Site Configuration
        </h2>
        <p className="text-gray-600">
          Configure your website's basic settings and preferences.
        </p>
      </div>

      {verificationData && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-green-900 mb-2">Purchase Verified</h3>
          <div className="text-sm text-green-700 space-y-1">
            <p>
              <strong>Item:</strong> {verificationData.item.name}
            </p>
            <p>
              <strong>License:</strong> {verificationData.item.license}
            </p>
            <p>
              <strong>Buyer:</strong> {verificationData.item.buyer}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ValidatedInput
            id="siteName"
            label="Site Name"
            placeholder="My Awesome Website"
            value={formData.siteName}
            onChange={(value) => handleFieldChange("siteName", value)}
            required
            description="The name of your website (at least 3 characters)"
          />

          <ValidatedInput
            id="adminDisplayName"
            label="Admin Display Name"
            placeholder="Site Administrator"
            value={formData.adminDisplayName}
            onChange={(value) => handleFieldChange("adminDisplayName", value)}
            required
            description="Your display name in the admin area"
          />
        </div>

        <div>
          <label
            htmlFor="siteDescription"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Site Description
          </label>
          <textarea
            id="siteDescription"
            value={formData.siteDescription}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                siteDescription: e.target.value,
              }))
            }
            placeholder="A brief description of your website..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-gray-500 text-sm mt-1">
            Optional: Brief description for search engines
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Options</h3>

          <div className="flex items-start">
            <input
              type="checkbox"
              id="seedSampleData"
              checked={formData.seedSampleData}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  seedSampleData: e.target.checked,
                }))
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
            />
            <div className="ml-3">
              <label
                htmlFor="seedSampleData"
                className="text-sm font-medium text-gray-700"
              >
                Install sample content
              </label>
              <p className="text-sm text-gray-500">
                Recommended for new users - includes example posts and pages
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <input
              type="checkbox"
              id="strongPasswordPolicy"
              checked={formData.strongPasswordPolicy}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  strongPasswordPolicy: e.target.checked,
                }))
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
            />
            <div className="ml-3">
              <label
                htmlFor="strongPasswordPolicy"
                className="text-sm font-medium text-gray-700"
              >
                Enforce strong password policy
              </label>
              <p className="text-sm text-gray-500">
                Recommended - requires strong passwords for all users
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <input
              type="checkbox"
              id="enableTwoFactor"
              checked={formData.enableTwoFactor}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  enableTwoFactor: e.target.checked,
                }))
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
            />
            <div className="ml-3">
              <label
                htmlFor="enableTwoFactor"
                className="text-sm font-medium text-gray-700"
              >
                Enable two-factor authentication for admin account
              </label>
              <p className="text-sm text-gray-500">
                Enhanced security - you'll receive backup codes after
                installation
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            updateStepCompletion("configure", true);
            setCurrentStep(3);
          }}
          disabled={!isSiteConfigValid()}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {!isSiteConfigValid() ? (
            <>
              <AlertCircle className="w-5 h-5 mr-2" />
              Please fill in required fields
            </>
          ) : (
            "Continue to Admin Setup"
          )}
        </button>
      </div>
    </div>
  );

  const AdminSetupStep = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <User className="w-16 h-16 text-blue-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Create Admin Account
        </h2>
        <p className="text-gray-600">
          Create your administrator account to manage your website.
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ValidatedInput
            id="adminUsername"
            label="Username"
            placeholder="admin"
            value={formData.adminUsername}
            onChange={(value) => handleFieldChange("adminUsername", value)}
            required
            description="3+ characters, letters, numbers, and underscores only"
          />

          <ValidatedInput
            id="adminEmail"
            label="Email Address"
            type="email"
            placeholder="admin@example.com"
            value={formData.adminEmail}
            onChange={(value) => handleFieldChange("adminEmail", value)}
            required
            description="Used for login and notifications"
          />
        </div>

        <ValidatedInput
          id="adminPassword"
          label="Password"
          type={showPassword ? "text" : "password"}
          placeholder="Create a strong password"
          value={formData.adminPassword}
          onChange={(value) => handleFieldChange("adminPassword", value)}
          required
          showPasswordToggle
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
        />

        {formData.adminPassword && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div
                className={`h-1 flex-1 rounded ${passwordStrength.score >= 1 ? "bg-red-500" : "bg-gray-200"}`}
              />
              <div
                className={`h-1 flex-1 rounded ${passwordStrength.score >= 2 ? "bg-yellow-500" : "bg-gray-200"}`}
              />
              <div
                className={`h-1 flex-1 rounded ${passwordStrength.score >= 3 ? "bg-blue-500" : "bg-gray-200"}`}
              />
              <div
                className={`h-1 flex-1 rounded ${passwordStrength.score >= 4 ? "bg-green-500" : "bg-gray-200"}`}
              />
              <div
                className={`h-1 flex-1 rounded ${passwordStrength.score >= 5 ? "bg-green-600" : "bg-gray-200"}`}
              />
            </div>
            <div className="text-xs space-y-1">
              <div
                className={`flex items-center ${passwordStrength.checks.length ? "text-green-600" : "text-gray-400"}`}
              >
                <span className="mr-1">
                  {passwordStrength.checks.length ? "✓" : "○"}
                </span>
                At least 8 characters
              </div>
              <div
                className={`flex items-center ${passwordStrength.checks.uppercase ? "text-green-600" : "text-gray-400"}`}
              >
                <span className="mr-1">
                  {passwordStrength.checks.uppercase ? "✓" : "○"}
                </span>
                One uppercase letter
              </div>
              <div
                className={`flex items-center ${passwordStrength.checks.lowercase ? "text-green-600" : "text-gray-400"}`}
              >
                <span className="mr-1">
                  {passwordStrength.checks.lowercase ? "✓" : "○"}
                </span>
                One lowercase letter
              </div>
              <div
                className={`flex items-center ${passwordStrength.checks.number ? "text-green-600" : "text-gray-400"}`}
              >
                <span className="mr-1">
                  {passwordStrength.checks.number ? "✓" : "○"}
                </span>
                One number
              </div>
              <div
                className={`flex items-center ${passwordStrength.checks.special ? "text-green-600" : "text-gray-400"}`}
              >
                <span className="mr-1">
                  {passwordStrength.checks.special ? "✓" : "○"}
                </span>
                One special character (@$!%*?&)
              </div>
            </div>
            <div className="text-sm">
              <span
                className={`font-medium ${
                  passwordStrength.score <= 2
                    ? "text-red-600"
                    : passwordStrength.score === 3
                      ? "text-yellow-600"
                      : passwordStrength.score === 4
                        ? "text-blue-600"
                        : "text-green-600"
                }`}
              >
                Password strength:{" "}
                {passwordStrength.score <= 2
                  ? "Weak"
                  : passwordStrength.score === 3
                    ? "Fair"
                    : passwordStrength.score === 4
                      ? "Good"
                      : "Strong"}
              </span>
            </div>
          </div>
        )}

        <ValidatedInput
          id="confirmPassword"
          label="Confirm Password"
          type={showConfirmPassword ? "text" : "password"}
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChange={(value) => handleFieldChange("confirmPassword", value)}
          required
          showPasswordToggle
          showPassword={showConfirmPassword}
          onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
        />

        {error && (
          <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        <button
          onClick={handleInstallation}
          disabled={!isAdminSetupValid()}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {!isAdminSetupValid() ? (
            <>
              <AlertCircle className="w-5 h-5 mr-2" />
              Complete all fields correctly
            </>
          ) : (
            <>
              <Database className="w-5 h-5 mr-2" />
              Install Vyral CMS
            </>
          )}
        </button>
      </div>
    </div>
  );

  const InstallationProgressStep = () => (
    <div className="max-w-md mx-auto text-center">
      <Database className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-pulse" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Installing Vyral CMS
      </h2>
      <p className="text-gray-600 mb-8">
        Please wait while we set up your website...
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mr-3" />
          <span className="text-gray-700">Setting up database...</span>
        </div>
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mr-3" />
          <span className="text-gray-700">Creating admin account...</span>
        </div>
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mr-3" />
          <span className="text-gray-700">Configuring settings...</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg mt-6">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}
    </div>
  );

  const CompletionStep = () => {
    const installationData = JSON.parse(
      localStorage.getItem("vyral_installation_data") || "{}"
    );

    return (
      <div className="max-w-2xl mx-auto text-center">
        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Installation Complete!
        </h2>
        <p className="text-gray-600 mb-8">
          Vyral CMS has been successfully installed and configured.
        </p>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium text-green-900 mb-4">
            Your Login Details
          </h3>
          <div className="text-left space-y-2 text-sm">
            <p>
              <strong>Admin URL:</strong>{" "}
              <a
                href={installationData.adminUrl}
                className="text-blue-600 hover:underline"
              >
                {installationData.adminUrl}
              </a>
            </p>
            <p>
              <strong>Username:</strong>{" "}
              {installationData.adminCredentials?.username}
            </p>
            <p>
              <strong>Email:</strong> {installationData.adminCredentials?.email}
            </p>
          </div>
        </div>

        {installationData.backupCodes && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-yellow-900 mb-4">
              Two-Factor Authentication Backup Codes
            </h3>
            <p className="text-sm text-yellow-800 mb-4">
              Save these backup codes in a safe place. You can use them to
              access your account if you lose access to your authenticator app.
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm font-mono">
              {installationData.backupCodes.map(
                (code: string, index: number) => (
                  <div key={index} className="bg-white p-2 rounded border">
                    {code}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <a
            href={installationData.adminUrl}
            className="inline-block bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700"
          >
            Go to Admin Dashboard
          </a>
          <a
            href={installationData.siteUrl}
            className="inline-block ml-4 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200"
          >
            View Your Website
          </a>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>Thank you for choosing Vyral CMS!</p>
          <p className="mt-1">
            Need help? Visit our{" "}
            <a
              href="https://docs.vyral.com"
              className="text-blue-600 hover:underline"
            >
              documentation
            </a>{" "}
            or{" "}
            <a
              href="https://support.vyral.com"
              className="text-blue-600 hover:underline"
            >
              support center
            </a>
            .
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Vyral CMS Installation
          </h1>
          <p className="text-gray-600">
            Welcome to the installation wizard for Vyral CMS
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <StepIndicator />

          {currentStep === 1 && <PurchaseVerificationStep />}
          {currentStep === 2 && <SiteConfigurationStep />}
          {currentStep === 3 && <AdminSetupStep />}
          {currentStep === 4 && <InstallationProgressStep />}
          {currentStep === 5 && <CompletionStep />}
        </div>
      </div>
    </div>
  );
};

export default InstallationWizard;

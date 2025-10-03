import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Mail, Phone, MapPin, Clock, Send, CheckCircle } from "lucide-react";
import { contactAPI } from "../services/api";
import Button from "../components/common/Button";
import BackgroundWrapper from "../components/common/BackgroundWrapper";
import toast from "react-hot-toast";
import ScrollReveal from "../components/common/ScrollReveal";
import "./Contact.css";

const Contact = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm();

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);

      const response = await contactAPI.submitContactForm({
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        phone: data.phone ? data.phone.trim() : "",
        subject: data.subject.trim(),
        message: data.message.trim(),
        orderNumber: data.orderNumber ? data.orderNumber.trim() : "",
      });

      if (response.data.success) {
        setIsSubmitted(true);
        toast.success("Message sent successfully!");
        reset();

        setTimeout(() => {
          setIsSubmitted(false);
        }, 5000);
      }
    } catch (error) {
      console.error("Contact form error:", error);

      if (error.response?.data?.errors) {
        error.response.data.errors.forEach((err) => {
          toast.error(err);
        });
      } else if (error.response?.status === 429) {
        toast.error("Too many submissions. Please try again in 15 minutes.");
      } else {
        const message =
          error.response?.data?.message ||
          "Failed to send message. Please try again.";
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BackgroundWrapper>
      <div className="contact-page">
        <div className="container">
          <ScrollReveal direction="fade">
            {/* Page Header */}
            <div className="contact-header">
              <h1>Contact Us</h1>
              <p>
                We'd love to hear from you. Send us a message and we'll respond
                as soon as possible.
              </p>
            </div>
          </ScrollReveal>

          <div className="contact-content">
            <ScrollReveal direction="left">
              {/* Contact Info */}
              <div className="contact-info">
                <h2>Get in Touch</h2>
                <p>
                  Have a question, concern, or just want to say hello? We're
                  here to help!
                </p>

                <div className="contact-methods">
                  <div className="contact-method">
                    <div className="method-icon">
                      <Mail size={24} />
                    </div>
                    <div className="method-details">
                      <h3>Email Us</h3>
                      <p>support@lilyth.com</p>
                      <span>We'll respond within 24 hours</span>
                    </div>
                  </div>

                  <div className="contact-method">
                    <div className="method-icon">
                      <Phone size={24} />
                    </div>
                    <div className="method-details">
                      <h3>Call Us</h3>
                      <p>+91 1234567890</p>
                      <span>Mon-Fri, 9AM-6PM</span>
                    </div>
                  </div>

                  <div className="contact-method">
                    <div className="method-icon">
                      <Clock size={24} />
                    </div>
                    <div className="method-details">
                      <h3>Business Hours</h3>
                      <p>
                        Monday - Friday: 9AM - 6PM
                        <br />
                        Saturday: 10AM - 4PM
                        <br />
                        Sunday: Closed
                      </p>
                    </div>
                  </div>
                </div>

                {/* FAQ Section */}
                <div className="faq-section">
                  <h3>Frequently Asked Questions</h3>
                  <div className="faq-list">
                    <div className="faq-item">
                      <strong>How long does shipping take?</strong>
                      <p>
                        Standard shipping takes 3-5 business days. Express
                        shipping is available for 1-2 business days.
                      </p>
                    </div>
                    <div className="faq-item">
                      <strong>What's your return policy?</strong>
                      <p>
                        We offer 30-day returns on unworn items with original
                        tags attached.
                      </p>
                    </div>
                    <div className="faq-item">
                      <strong>Do you offer international shipping?</strong>
                      <p>No, we only deliver across kerala.</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Contact Form */}
            <ScrollReveal direction="right" delay={0.2}>
              <div className="contact-form-container">
                {isSubmitted ? (
                  <div className="success-message">
                    <CheckCircle size={48} className="success-icon" />
                    <h2>Message Sent!</h2>
                    <p>
                      Thank you for contacting us. We've received your message
                      and will get back to you within 24 hours.
                    </p>
                    <Button
                      onClick={() => setIsSubmitted(false)}
                      variant="outline"
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="contact-form"
                  >
                    <h2>Send us a Message</h2>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="name" className="form-label">
                          Full Name *
                        </label>
                        <input
                          id="name"
                          type="text"
                          className={`form-control ${
                            errors.name ? "error" : ""
                          }`}
                          placeholder="Your full name"
                          {...register("name", {
                            required: "Name is required",
                            minLength: {
                              value: 2,
                              message: "Name must be at least 2 characters",
                            },
                            maxLength: {
                              value: 100,
                              message: "Name must be less than 100 characters",
                            },
                          })}
                        />
                        {errors.name && (
                          <span className="form-error">
                            {errors.name.message}
                          </span>
                        )}
                      </div>

                      <div className="form-group">
                        <label htmlFor="email" className="form-label">
                          Email Address *
                        </label>
                        <input
                          id="email"
                          type="email"
                          className={`form-control ${
                            errors.email ? "error" : ""
                          }`}
                          placeholder="your.email@example.com"
                          {...register("email", {
                            required: "Email is required",
                            pattern: {
                              value:
                                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                              message: "Please enter a valid email address",
                            },
                          })}
                        />
                        {errors.email && (
                          <span className="form-error">
                            {errors.email.message}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="phone" className="form-label">
                          Phone Number
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          className={`form-control ${
                            errors.phone ? "error" : ""
                          }`}
                          placeholder="+1 (555) 123-4567"
                          {...register("phone", {
                            pattern: {
                              value: /^\+?[\d\s\-\(\)]+$/,
                              message: "Please enter a valid phone number",
                            },
                          })}
                        />
                        {errors.phone && (
                          <span className="form-error">
                            {errors.phone.message}
                          </span>
                        )}
                      </div>

                      <div className="form-group">
                        <label htmlFor="orderNumber" className="form-label">
                          Order Number (Optional)
                        </label>
                        <input
                          id="orderNumber"
                          type="text"
                          className="form-control"
                          placeholder="ORD-12345"
                          {...register("orderNumber")}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="subject" className="form-label">
                        Subject *
                      </label>
                      <select
                        id="subject"
                        className={`form-control ${
                          errors.subject ? "error" : ""
                        }`}
                        {...register("subject", {
                          required: "Please select a subject",
                        })}
                      >
                        <option value="">Select a subject</option>
                        <option value="General Inquiry">General Inquiry</option>
                        <option value="Order Support">Order Support</option>
                        <option value="Product Question">
                          Product Question
                        </option>
                        <option value="Shipping & Returns">
                          Shipping & Returns
                        </option>
                        <option value="Size & Fit">Size & Fit</option>
                        <option value="Technical Issue">Technical Issue</option>
                        <option value="Feedback">Feedback</option>
                        <option value="Partnership">Partnership</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.subject && (
                        <span className="form-error">
                          {errors.subject.message}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="message" className="form-label">
                        Message *
                      </label>
                      <textarea
                        id="message"
                        rows="6"
                        className={`form-control ${
                          errors.message ? "error" : ""
                        }`}
                        placeholder="Please provide as much detail as possible..."
                        {...register("message", {
                          required: "Message is required",
                          minLength: {
                            value: 10,
                            message: "Message must be at least 10 characters",
                          },
                          maxLength: {
                            value: 2000,
                            message:
                              "Message must be less than 2000 characters",
                          },
                        })}
                      />
                      {errors.message && (
                        <span className="form-error">
                          {errors.message.message}
                        </span>
                      )}
                      <div className="character-count">
                        <span>Max 2000 characters</span>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="submit-btn"
                      loading={isSubmitting}
                      disabled={isSubmitting}
                    >
                      <Send size={18} />
                      {isSubmitting ? "Sending..." : "Send Message"}
                    </Button>

                    <div className="form-note">
                      <p>
                        By submitting this form, you agree to our privacy
                        policy. We'll only use your information to respond to
                        your inquiry.
                      </p>
                    </div>
                  </form>
                )}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </BackgroundWrapper>
  );
};

export default Contact;

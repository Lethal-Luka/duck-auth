const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
    if (process.env.NODE_ENV === 'production') {
        // Production email configuration (use your preferred email service)
        return nodemailer.createTransporter({
            service: 'gmail', // or 'sendgrid', 'mailgun', etc.
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    } else {
        // Development configuration (using Ethereal Email for testing)
        return nodemailer.createTransporter({
            host: 'smtp.ethereal.email',
            port: 587,
            auth: {
                user: process.env.EMAIL_USER || 'ethereal.user@ethereal.email',
                pass: process.env.EMAIL_PASS || 'ethereal.pass'
            }
        });
    }
};

const sendEmail = async ({ to, subject, html, text }) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: `"Duck Auth" <${process.env.EMAIL_FROM || 'noreply@duckauth.com'}>`,
            to,
            subject,
            html,
            text: text || html.replace(/<[^>]*>/g, '') // Strip HTML if no text provided
        };

        const info = await transporter.sendMail(mailOptions);
        
        if (process.env.NODE_ENV !== 'production') {
            console.log('Email sent:', info.messageId);
            console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
        }

        return info;
    } catch (error) {
        console.error('Email sending error:', error);
        throw new Error('Failed to send email');
    }
};

module.exports = { sendEmail };
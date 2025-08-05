import React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface InvitationEmailProps {
  inviterName: string;
  tenantName: string;
  invitationLink: string;
  expiresAt: Date;
}

export const InvitationEmail = ({
  inviterName,
  tenantName,
  invitationLink,
  expiresAt,
}: InvitationEmailProps) => {
  const previewText = `${inviterName} invited you to join ${tenantName} on Figgy`;
  const formattedDate = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(expiresAt);

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>You're invited to Figgy</Heading>

          <Text style={text}>Hi there,</Text>

          <Text style={text}>
            {inviterName} has invited you to join the{" "}
            <strong>{tenantName}</strong> team on Figgy, the intelligent
            accounting assistant that makes managing your finances easier.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={invitationLink}>
              Accept Invitation
            </Button>
          </Section>

          <Text style={text}>
            Or copy and paste this URL into your browser:
          </Text>

          <Link href={invitationLink} style={link}>
            {invitationLink}
          </Link>

          <Text style={footer}>
            This invitation will expire on {formattedDate}. If you didn't expect
            this invitation, you can safely ignore this email.
          </Text>

          <Text style={signature}>
            Best regards,
            <br />
            The Figgy Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// Styles following Figgy brand
const main = {
  backgroundColor: "#faf2e8", // Cream Canvas
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "40px auto",
  padding: "40px 48px",
  borderRadius: "8px",
  maxWidth: "600px",
  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
};

const h1 = {
  color: "#5e2b94", // Fig Purple
  fontSize: "28px",
  fontWeight: "600",
  lineHeight: "36px",
  margin: "0 0 32px",
  textAlign: "center" as const,
};

const text = {
  color: "#333333",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#5e2b94", // Fig Purple
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "500",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 32px",
  border: "1px solid #5e2b94",
};

const link = {
  color: "#5e2b94",
  fontSize: "14px",
  textDecoration: "underline",
  wordBreak: "break-all" as const,
};

const footer = {
  color: "#666666",
  fontSize: "14px",
  lineHeight: "20px",
  marginTop: "32px",
  borderTop: "1px solid #eeeeee",
  paddingTop: "24px",
};

const signature = {
  color: "#333333",
  fontSize: "16px",
  lineHeight: "24px",
  marginTop: "32px",
};

export default InvitationEmail;

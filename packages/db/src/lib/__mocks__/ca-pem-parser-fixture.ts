/**
 * A real, self-signed certificate (its key is not in the repository), because the credentials
 * builder parses what it is given and a random string cannot stand in for a certificate: node's
 * `X509Certificate` rejects it, and faker cannot produce one.
 *
 * A fixed value on purpose, so this file is a fixture and not a `generate-*` factory: rule 9 of
 * `docs/style-guide/test-organization.md` allows a literal for a parser or validator test whose
 * exact payload is the thing under test. Do not use it as general test data, and do not copy this
 * pattern for anything that could use faker.
 */
export const CA_PEM_PARSER_FIXTURE: string = [
	"-----BEGIN CERTIFICATE-----",
	"MIIDFjCCAf6gAwIBAgITKrEnLg4h5r9sN23ydWyk2AKkYjANBgkqhkiG9w0BAQsF",
	"ADAaMRgwFgYDVQQDDA9mcnViYmxlLXRlc3QtY2EwIBcNMjYxMTA1MDExMTIwWhgP",
	"MjEyNjEwMTIwMTExMjBaMBoxGDAWBgNVBAMMD2ZydWJibGUtdGVzdC1jYTCCASIw",
	"DQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALEYmm13H0DqpfeAQOqui8dWeYEa",
	"ALG1t8u2TG+GlJJEEkcwse4SVBi7NOGagywsp4deZqD71P8nb1R62L8RJZxeM09+",
	"pXyximVqhSJMl508t94kmfbubiZX8w51UawrHN5lSdJ++qFMe0H2is5KhI3qPPnC",
	"PNZ1qvaZZuP2t0SV1orlZe55WCOLL95MsVk63mZ2hWMCxMyU1XE4cujwWAn6Ofys",
	"P8v9mJhz/hT1vLayy+bs8cECGAAGukLV5e61RXZ5i/HoIcAKYdijavjWhIefcRAf",
	"NbW75X3qzfkp1Zzhjj8SCF31giE69TYMtSKPTrk20qSeKhh54xwTZTL5s88CAwEA",
	"AaNTMFEwHQYDVR0OBBYEFHiJWnjA6L/FD3uTWvgR+lThxG8YMB8GA1UdIwQYMBaA",
	"FHiJWnjA6L/FD3uTWvgR+lThxG8YMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcN",
	"AQELBQADggEBAAmk07iN4NBhL8st6wC6tGV53FbJ7m8NdJ9rProb9jwE+ngov+dr",
	"V212PEu24VxpAdY4G+H19NPyMk/y23zgzYwDYuYFqRastWpEPyaxhLFQDn/djaVE",
	"udXFT70vfbhCg4vmBODJugqhPf/qyz7tmnKnGkE6hG0mDRFtj7u9FeEKbs0Rhh8v",
	"LBAeD68t6jVrcBXBaiCkByl1DHoLmq+jGnTVZKw0uQAWG2lxI769Bv4rESxFuHCd",
	"u1ImRKuTYSipInMFmkylVg7XkxnPgbCJjfy+dlI/Uvd67Fo+TcgJ1X6zcEtw5JpF",
	"NADbtNL3i4bRj0K68khFzegtQLZmZB7jyi8=",
	"-----END CERTIFICATE-----",
].join("\n");

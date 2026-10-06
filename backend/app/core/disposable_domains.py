"""
Throw-away email services. Accounts made with these exist only to collect
the free credits again and again, so sign-up refuses them.

This is a deterrent, not a wall: new throw-away services appear all the
time. Add more here, or without a deploy through BLOCKED_EMAIL_DOMAINS.
"""

DISPOSABLE_DOMAINS = frozenset(
    {
        "10minutemail.com", "10minutemail.net", "20minutemail.com",
        "burnermail.io", "discard.email", "dispostable.com",
        "dropmail.me", "emailondeck.com", "fakeinbox.com",
        "getairmail.com", "getnada.com", "guerrillamail.biz",
        "guerrillamail.com", "guerrillamail.de", "guerrillamail.net",
        "guerrillamail.org", "guerrillamailblock.com", "harakirimail.com",
        "inboxbear.com", "inboxkitten.com", "jetable.org",
        "mail.tm", "mailcatch.com", "maildrop.cc", "mailinator.com",
        "mailinator.net", "mailnesia.com", "mailnull.com",
        "mailsac.com", "mintemail.com", "mohmal.com", "moakt.com",
        "mytemp.email", "nada.email", "sharklasers.com", "spam4.me",
        "spamgourmet.com", "temp-mail.io", "temp-mail.org",
        "tempail.com", "tempinbox.com", "tempmail.com", "tempmail.net",
        "tempmailo.com", "tempr.email", "throwawaymail.com",
        "tmail.ws", "tmailor.com", "tmpmail.net", "tmpmail.org",
        "trash-mail.com", "trashmail.com", "trashmail.de",
        "trashmail.io", "trashmail.net", "yopmail.com", "yopmail.fr",
        "yopmail.net", "grr.la", "fexpost.com", "emailfake.com",
        "mailpoof.com", "mail7.io", "mailforspam.com", "mvrht.net",
        "easytrashmail.com", "gufum.com", "spambox.us", "mailbox.in.ua",
        "linshiyouxiang.net", "luxusmail.org", "owlymail.com",
    }
)

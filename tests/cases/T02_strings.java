public class Main {
    public static void main(String[] args) {
        String s = "  Hello, World  ";
        System.out.println("[" + s.trim() + "] " + s.length() + " " + s.trim().toUpperCase() + " " + s.toLowerCase());
        String t = "Java Programming";
        System.out.println(t.charAt(5) + " " + t.indexOf('a') + " " + t.indexOf("gram") + " " + t.lastIndexOf('a') + " " + t.indexOf('z'));
        System.out.println(t.substring(5) + "|" + t.substring(0, 4) + "|" + t.contains("Pro") + " " + t.startsWith("Ja") + " " + t.endsWith("ing"));
        System.out.println(t.replace('a', 'o') + " " + t.replace("Java", "Kotlin") + " " + t.replaceAll("[aeiou]", "*"));
        String[] parts = "a,b,,c,,".split(",");
        System.out.println(parts.length + " " + String.join("|", parts));
        System.out.println("one  two three".split("\\s+").length + " " + " x y".split(" ").length);
        System.out.println("abc".split("").length + " " + "".split(",").length + " " + ",".split(",").length);
        System.out.println("a1b2c3".split("\\d").length);
        System.out.println("Hello".equals("hello") + " " + "Hello".equalsIgnoreCase("hello") + " " + "".isEmpty() + " " + "  ".isBlank());
        System.out.println("ab".repeat(3) + " " + "x".concat("y") + " " + "hello".hashCode() + " " + "".hashCode());
        StringBuilder sb = new StringBuilder("abc");
        sb.append(1).append('d').append(2.5).append(true).insert(0, "<").reverse();
        System.out.println(sb + " " + sb.length() + " " + sb.charAt(0));
        sb.setLength(3); sb.deleteCharAt(0); System.out.println(sb.toString());
        System.out.println(String.format("|%5d|%-5d|%05d|%,d|%+d|", 42, 42, 42, 1234567, 42));
        System.out.println(String.format("|%.2f|%8.3f|%-8.1f|%,.2f|%.0f|%e|", 3.14159, 2.5, 1.25, 1234567.891, 2.5, 12345.678));
        System.out.println(String.format("|%s|%10s|%-10s|%.3s|%S|%c|%b|%x|%X|%o|%%|", "hi", "right", "left", "truncate", "up", 'z', true, 255, 255, 8));
        System.out.printf("%d items cost Rp %,.2f%n", 3, 15000.5);
        System.out.printf("%-10s%5s%n", "Name", "Qty");
        System.out.println(String.format("%.2f %.2f %.2f %.1f %.1f", 1.005, 2.675, 0.125, 0.05, 0.15));
        System.out.println(String.format("%08.2f|%(d|% d", -3.5, -5, 5));
        char[] cs = "hello".toCharArray(); cs[0] = 'J';
        System.out.println(new String(cs) + " " + String.valueOf(cs) + " " + cs.length);
        System.out.println("a-b-c".lastIndexOf("-") + " " + "Mississippi".indexOf("ss", 3));
        System.out.println("hello world".matches("[a-z ]+") + " " + "abc123".matches("[a-z]+"));
        System.out.println("Tom,Jerry;Spike".split("[,;]")[2]);
        String multi = "x"; multi += 5; multi += 'c'; multi += 1.5; System.out.println(multi);
        System.out.println("A".compareToIgnoreCase("b") + " " + "apple".compareTo("Apple"));
        System.out.println("Hello".chars().count());
        String txt = """
            Hello
              Block
            """;
        System.out.print(txt);
        System.out.println("tab\there \"quoted\" back\\slash");
        System.out.println("x".equals(null) + " " + "abc".indexOf(""));
    }
}

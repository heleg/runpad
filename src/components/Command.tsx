import { Box, Text } from "ink";

interface CommandProps {
  isSelected: boolean;
  name: string;
  script: string;
}

const Command = ({ isSelected, name, script }: CommandProps) => {
  const cursor = isSelected ? "▸ " : "  ";
  const nameColor = isSelected ? "greenBright" : "green";
  const scriptColor = isSelected ? "blueBright" : "blue";
  return (
    <Box width="100%" height={1} flexShrink={0}>
      <Text wrap="truncate-end">
        <Text color="green">{cursor}</Text>
        <Text bold={isSelected} color={nameColor}>
          {name}
        </Text>
        <Text>&nbsp;:&nbsp;</Text>
        <Text bold={isSelected} color={scriptColor}>
          {script.replace(/\s+/g, " ")}
        </Text>
      </Text>
    </Box>
  );
};
export default Command;
